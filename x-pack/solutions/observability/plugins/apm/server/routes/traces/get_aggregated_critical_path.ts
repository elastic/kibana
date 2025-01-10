/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { Logger } from '@kbn/logging';
import { getRequestBase } from '@kbn/apm-data-access-plugin/server/lib/helpers/create_es_client/create_apm_event_client/get_request_base';
import { chunk } from 'lodash';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { TIMESTAMP_US } from '../../../common/es_fields/apm';
import { PROCESSOR_EVENT, SPAN_DURATION, SPAN_NAME } from '../../../common/es_fields/apm';
import {
  TRACE_ID,
  AGENT_NAME,
  SERVICE_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  SPAN_ID,
  TRANSACTION_ID,
  PARENT_ID,
  TRANSACTION_DURATION,
} from '../../../common/es_fields/apm';
import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import type { EsClient } from '../../lib/helpers/get_esql_client';

type OperationMetadata = {
  [SERVICE_NAME]: string;
  [AGENT_NAME]: AgentName;
} & (
  | {
      [PROCESSOR_EVENT]: ProcessorEvent.transaction;
      [TRANSACTION_TYPE]: string;
      [TRANSACTION_NAME]: string;
    }
  | {
      [PROCESSOR_EVENT]: ProcessorEvent.span;
      [SPAN_NAME]: string;
      [SPAN_TYPE]?: string;
      [SPAN_SUBTYPE]?: string;
    }
);

type QueryResult = {
  'event.id': string;
  'event.name': string;
  'event.type': string;
  'event.duration': number;
  [TRACE_ID]: string;
  [PARENT_ID]?: string;
  [SERVICE_NAME]: string;
  [TIMESTAMP_US]: number;
  [AGENT_NAME]: AgentName;
} & (
  | {
      [PROCESSOR_EVENT]: ProcessorEvent.span;
      [SPAN_SUBTYPE]: string;
    }
  | { [PROCESSOR_EVENT]: ProcessorEvent.transaction }
);

interface Event {
  traceId: string;
  id: string;
  parentId?: string;
  processorEvent: ProcessorEvent;
  operationId: string;
  timestamp: number;
  duration: number;
  skew: number;
  offset?: number;
  end?: number;
  children: Event[];
}

type OperationId = string;
type NodeId = string;

export interface CriticalPathResponse {
  metadata: Record<OperationId, OperationMetadata>;
  timeByNodeId: Record<NodeId, number>;
  nodes: Record<NodeId, NodeId[]>;
  rootNodes: NodeId[];
  operationIdByNodeId: Record<NodeId, OperationId>;
}

export async function getAggregatedCriticalPath({
  traceIds,
  start,
  end,
  serviceName,
  transactionName,
  logger,
  esqlClient,
}: {
  traceIds: string[];
  start: number;
  end: number;
  serviceName: string | null;
  transactionName: string | null;
  logger: Logger;
  esqlClient: EsClient;
}): Promise<{ criticalPath: CriticalPathResponse | null }> {
  const { index, filters } = getRequestBase({
    apm: { events: [ProcessorEvent.span, ProcessorEvent.transaction] },
    indices: esqlClient.indices,
  });

  const chunks = chunk(traceIds, 50);
  const groupEventsChunked = await Promise.all(
    chunks.map(async (traceIdChunks) => {
      const response = await fetchCriticalPath({
        traceIds: traceIdChunks,
        start,
        end,
        index,
        filters,
        logger,
        esqlClient,
      });

      return groupEvents(response.hits);
    })
  );

  const now = performance.now();

  const { eventsById, metadataByOperationId } = mergeGroupedEventsChunks(groupEventsChunked);
  const { entryIds, eventTree } = processEventTree({
    eventsById,
    metadataByOperationId,
    serviceName,
    transactionName,
  });
  const { timeByNodeId, nodes, rootNodes, operationIdByNodeId } = buildCriticalPath({
    entryIds,
    eventTree,
    metadataByOperationId,
  });

  logger.debug(`Built critical path in ${performance.now() - now}ms`);

  return {
    criticalPath: {
      metadata: Object.fromEntries(metadataByOperationId),
      timeByNodeId: Object.fromEntries(timeByNodeId),
      nodes: Object.fromEntries(nodes),
      rootNodes: Array.from(rootNodes),
      operationIdByNodeId: Object.fromEntries(operationIdByNodeId),
    },
  };
}

const fetchCriticalPath = async ({
  traceIds,
  start,
  end,
  logger,
  esqlClient,
  filters,
  index,
}: {
  traceIds: string[];
  start: number;
  end: number;
  logger: Logger;
  esqlClient: EsClient;
  filters: QueryDslQueryContainer[];
  index: string[];
}) => {
  const now = performance.now();

  // The query does the following:
  // 1. Gets the latest event.duration, agent.name and parent.id for each event.id, event.name, and service.name.
  //  Due to the  lack of esql native aggregation to get the latest value of a field,
  //  we use the EVAL function to create a new field that is a concatenation of the timestamp and the value of the field we want to get the latest value of.
  //  We then use the STATS function to get the latest value of the field by trace ID, event ID, event name, and service name.
  // 2. Groups the events by trace ID, event ID, event name, and service name
  // 3. Sorts the events by parent ID and timestamp. Events without a parent ID are sorted last because they are the root events
  // and there could be many events with the same id. so we get the latest ingested event.
  // 4. Limits the number of events to 10,000 to try to avoid timeouts. This could lead to data loss and incomplete critical paths.
  const response = esqlClient.esql<QueryResult, { transform: 'plain' }>(
    'get_aggregated_critical_path',
    {
      query: `
        FROM ${index.join(',')}
          | EVAL event.id = CASE(processor.event == "span", ${SPAN_ID}, ${TRANSACTION_ID}),
              event.name = CASE(processor.event == "span", ${SPAN_NAME}, ${TRANSACTION_NAME}),
              event.type = CASE(processor.event == "span", ${SPAN_TYPE}, ${TRANSACTION_TYPE}),
              event.duration = CONCAT(${TIMESTAMP_US}::string, ":", CASE(processor.event == "span", ${SPAN_DURATION}, ${TRANSACTION_DURATION})::string),
              ${AGENT_NAME} = CONCAT(${TIMESTAMP_US}::string, ":", ${AGENT_NAME}),
              ${PARENT_ID} = CONCAT(${TIMESTAMP_US}::string, ":", ${PARENT_ID})
          | LIMIT 10000
          | STATS ${SPAN_SUBTYPE} = MAX(${SPAN_SUBTYPE}),
              ${PROCESSOR_EVENT} = MAX(${PROCESSOR_EVENT}),
              ${TIMESTAMP_US} = MAX(${TIMESTAMP_US}),
              ${PARENT_ID} = MAX(${PARENT_ID}),
              ${AGENT_NAME} = MAX(${AGENT_NAME}),
              event.type = MAX(event.type),
              event.duration = MAX(event.duration) BY ${TRACE_ID}, event.id, event.name, ${SERVICE_NAME}
          | EVAL ${PARENT_ID} = SPLIT(${PARENT_ID}, ":")
          | EVAL ${PARENT_ID} = TO_STRING(MV_LAST(${PARENT_ID}))
          | SORT parent.id ASC NULLS LAST, timestamp.us ASC
          | EVAL event.duration = SPLIT(event.duration, ":"),
              ${AGENT_NAME} = SPLIT(${AGENT_NAME}, ":")
          | EVAL event.duration = TO_LONG(MV_LAST(event.duration)),
              ${AGENT_NAME} = TO_STRING(MV_LAST(${AGENT_NAME}))
        `,
      filter: {
        bool: {
          filter: [...rangeQuery(start, end), ...termsQuery(TRACE_ID, ...traceIds), ...filters],
        },
      },
    },
    { transform: 'plain' }
  );

  logger.debug(
    `Retrieved critical path in ${performance.now() - now}ms for ${traceIds.length} traces`
  );

  return response;
};

const mergeGroupedEventsChunks = (groupedEventsChunks: Array<ReturnType<typeof groupEvents>>) =>
  groupedEventsChunks.reduce(
    (acc, curr) => {
      for (const [key, value] of curr.eventsById) {
        acc.eventsById.set(key, value);
      }

      for (const [key, value] of curr.metadataByOperationId) {
        acc.metadataByOperationId.set(key, value);
      }

      return acc;
    },
    {
      eventsById: new Map<string, Event>(),
      metadataByOperationId: new Map<OperationId, OperationMetadata>(),
    }
  );

function toHash(item: any): string {
  const FNV_32_INIT = 0x811c9dc5;
  const FNV_32_PRIME = 0x01000193;

  function deterministicSerialize(value: any): string {
    if (Array.isArray(value)) {
      return `[${value.map(deterministicSerialize).join(',')}]`;
    } else if (value && typeof value === 'object') {
      const keys = Object.keys(value).sort();
      return `{${keys.map((key) => `"${key}":${deterministicSerialize(value[key])}`).join(',')}}`;
    }
    return value;
  }

  const str = deterministicSerialize(item);

  let rv = FNV_32_INIT;

  for (let i = 0; i < str.length; i++) {
    // eslint-disable-next-line no-bitwise
    const bt = str.charCodeAt(i) & 0xff;
    // eslint-disable-next-line no-bitwise
    rv ^= bt;
    rv *= FNV_32_PRIME;
  }

  return rv.toString(16);
}

const groupEvents = (response: QueryResult[]) => {
  const eventsById = new Map<string, Event>();
  const metadataByOperationId = new Map<OperationId, OperationMetadata>();

  response.forEach((hit) => {
    const eventId = hit['event.id'];

    const metadata: OperationMetadata = {
      [SERVICE_NAME]: hit[SERVICE_NAME],
      [AGENT_NAME]: hit[AGENT_NAME] as AgentName,
      ...(hit[PROCESSOR_EVENT] === ProcessorEvent.span
        ? {
            [PROCESSOR_EVENT]: ProcessorEvent.span,
            [SPAN_NAME]: hit['event.name'],
            [SPAN_TYPE]: hit['event.type'],
            [SPAN_SUBTYPE]: hit[SPAN_SUBTYPE],
          }
        : {
            [PROCESSOR_EVENT]: ProcessorEvent.transaction,
            [TRANSACTION_NAME]: hit['event.name'],
            [TRANSACTION_TYPE]: hit['event.type'],
          }),
    };
    const operationId = toHash(metadata);

    eventsById.set(eventId, {
      traceId: hit[TRACE_ID],
      id: hit['event.id'],
      operationId,
      parentId: hit[PARENT_ID],
      processorEvent: hit[PROCESSOR_EVENT],
      timestamp: hit[TIMESTAMP_US],
      duration: hit['event.duration'],
      skew: 0,
      offset: 0,
      end: 0,
      children: [],
    });

    metadataByOperationId.set(operationId, metadata);
  });

  return { eventsById, metadataByOperationId };
};

function calculateOffsetsAndSkews({
  metadataByOperationId,
  event,
  startOfTrace,
}: {
  event: Event;
  metadataByOperationId: Map<string, OperationMetadata>;
  startOfTrace: number;
}) {
  const visited = new Set<string>();
  const stack: Array<{ currentEvent: Event; parent?: Event }> = [
    { currentEvent: event, parent: undefined },
  ];

  while (stack.length > 0) {
    const { currentEvent, parent } = stack.pop()!;

    if (visited.has(event.id)) {
      continue;
    }

    visited.add(event.id);

    event.skew = calculateClockSkew({ metadataByOperationId, event: currentEvent, parent });
    event.offset = event.timestamp - startOfTrace;
    event.end = event.offset + event.skew + event.duration;

    for (const child of event.children) {
      stack.push({ currentEvent: child, parent: event });
    }
  }
}

function calculateClockSkew({
  event,
  parent,
  metadataByOperationId,
}: {
  metadataByOperationId: Map<string, OperationMetadata>;
  event: Event;
  parent?: Event;
}): number {
  if (!parent) {
    return 0;
  }

  const operationMetadata = metadataByOperationId.get(event.operationId);
  if (operationMetadata?.[PROCESSOR_EVENT] !== ProcessorEvent.transaction) {
    return parent.skew;
  }

  const parentStart = parent.timestamp + parent.skew;
  const offsetStart = parentStart - event.timestamp;

  if (offsetStart > 0) {
    const latency = Math.round(Math.max(parent.duration - event.duration, 0) / 2);
    return latency;
  }

  return 0;
}

function spanGraph({
  event,
  path,
  nodes,
  operationIdByNodeId,
  timeByNodeId,
}: {
  event: Event;
  path: string[];
  nodes: Map<NodeId, NodeId[]>;
  operationIdByNodeId: Map<NodeId, OperationId>;
  timeByNodeId: Map<NodeId, number>;
}) {
  const stack: Array<{
    currentEvent: Event;
    currentPath: string[];
    startEvent: number;
    endEvent: number;
  }> = [{ currentEvent: event, currentPath: path, startEvent: 0, endEvent: event.duration }];

  while (stack.length > 0) {
    const { currentEvent, currentPath, startEvent, endEvent } = stack.pop()!;
    const nodeId = toHash(currentPath);

    const childNodes = nodes.get(nodeId) || [];
    nodes.set(nodeId, childNodes);
    operationIdByNodeId.set(nodeId, currentEvent.operationId);

    if (currentEvent.children.length === 0) {
      timeByNodeId.set(nodeId, (timeByNodeId.get(nodeId) || 0) + (endEvent - startEvent));
      continue;
    }

    const children = currentEvent.children.sort((a, b) => (b.end ?? 0) - (a.end ?? 0));
    let scanTime = endEvent;

    for (const child of children) {
      const normalizedChildStart = Math.max((child.offset ?? 0) + child.skew, startEvent);
      const childEnd = (child.offset ?? 0) + child.skew + child.duration;
      const normalizedChildEnd = Math.min(childEnd, scanTime);

      if (
        normalizedChildStart >= scanTime ||
        normalizedChildEnd < startEvent ||
        childEnd > scanTime
      ) {
        continue;
      }

      const childPath = [...currentPath, child.operationId];
      const childId = toHash(childPath);

      if (!childNodes.includes(childId)) {
        childNodes.push(childId);
      }

      if (normalizedChildEnd < scanTime - 1000) {
        timeByNodeId.set(nodeId, (timeByNodeId.get(nodeId) || 0) + (scanTime - normalizedChildEnd));
      }

      stack.push({
        currentEvent: child,
        currentPath: childPath,
        startEvent: normalizedChildStart,
        endEvent: childEnd,
      });

      scanTime = normalizedChildStart;
    }

    if (scanTime > startEvent) {
      timeByNodeId.set(nodeId, (timeByNodeId.get(nodeId) || 0) + (scanTime - startEvent));
    }
  }
}

export function buildCriticalPath({
  entryIds,
  eventTree,
  metadataByOperationId,
}: {
  entryIds: Set<string>;
  eventTree: Map<string, Event>;
  metadataByOperationId: Map<OperationId, OperationMetadata>;
}) {
  const timeByNodeId = new Map<NodeId, number>();
  const nodes = new Map<NodeId, NodeId[]>();
  const rootNodes = new Set<NodeId>();
  const operationIdByNodeId = new Map<NodeId, OperationId>();

  for (const entryId of entryIds) {
    const currentEvent = eventTree.get(entryId);

    if (!currentEvent) {
      continue;
    }

    const path = buildPathToRoot({ event: currentEvent, eventTree });

    const nodeId = toHash(path);

    calculateOffsetsAndSkews({
      event: currentEvent,
      metadataByOperationId,
      startOfTrace: currentEvent.timestamp,
    });

    spanGraph({
      event: currentEvent,
      path,
      nodes,
      operationIdByNodeId,
      timeByNodeId,
    });

    if (!rootNodes.has(nodeId)) {
      rootNodes.add(nodeId);
    }
  }

  return {
    timeByNodeId,
    nodes,
    rootNodes,
    operationIdByNodeId,
  };
}

function buildPathToRoot({
  event,
  eventTree: processedEvents,
}: {
  event: Event;
  eventTree: Map<string, Event>;
}): string[] {
  const path: string[] = [];
  let current = event;

  while (current) {
    path.push(current.operationId);
    if (!current.parentId) {
      break;
    }

    const parentEvent = processedEvents.get(current.parentId);
    if (parentEvent) {
      current = parentEvent;
    }
  }

  return path.reverse();
}

function processEventTree({
  eventsById,
  metadataByOperationId,
  serviceName,
  transactionName,
}: {
  eventsById: Map<string, Event>;
  metadataByOperationId: Map<OperationId, OperationMetadata>;
  serviceName: string | null;
  transactionName: string | null;
}) {
  const entryIds = new Set<string>();
  const eventTree = new Map<string, Event>();

  for (const event of eventsById.values()) {
    const stack: string[] = [event.id];
    const reprocessQueue = new Set<string>();

    const visited = new Set<string>();

    while (stack.length > 0) {
      const currentEventId = stack.pop()!;

      const currentEvent = eventsById.get(currentEventId);
      if (!currentEvent || eventTree.has(currentEvent.id)) {
        continue;
      }

      visited.add(currentEventId);

      if (currentEvent.parentId) {
        const processedParent = eventTree.get(currentEvent.parentId);
        if (processedParent) {
          processedParent.children.push(currentEvent);
        } else {
          const parentEvent = eventsById.get(currentEvent.parentId);
          if (!parentEvent && !visited.has(currentEvent.parentId)) {
            stack.push(currentEvent.parentId);
            reprocessQueue.add(currentEvent.id);
          }
        }
      }

      if (serviceName && transactionName) {
        const metadata = metadataByOperationId.get(currentEvent.operationId);
        if (
          metadata &&
          metadata[SERVICE_NAME] === serviceName &&
          metadata[PROCESSOR_EVENT] === ProcessorEvent.transaction &&
          metadata[TRANSACTION_NAME] === transactionName
        ) {
          entryIds.add(currentEvent.id);
        }
      } else if (!currentEvent.parentId) {
        entryIds.add(currentEvent.id);
      }

      eventTree.set(currentEvent.id, currentEvent);

      if (reprocessQueue.size > 0) {
        stack.push(...reprocessQueue);
        reprocessQueue.clear();
      }

      visited.delete(currentEventId);
    }
  }

  return { entryIds, eventTree };
}
