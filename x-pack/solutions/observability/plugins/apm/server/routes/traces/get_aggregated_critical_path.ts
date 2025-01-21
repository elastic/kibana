/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-bitwise */
import {
  from,
  observeOn,
  asyncScheduler,
  of,
  lastValueFrom,
  delay,
  concatMap,
  mergeMap,
  scan,
  last,
  map,
} from 'rxjs';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { Logger } from '@kbn/logging';
import { getRequestBase } from '@kbn/apm-data-access-plugin/server/lib/helpers/create_es_client/create_apm_event_client/get_request_base';
import { chunk } from 'lodash';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';

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
  AT_TIMESTAMP,
  PROCESSOR_EVENT,
  SPAN_DURATION,
  SPAN_NAME,
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
  [PARENT_ID]?: string;
  [SERVICE_NAME]: string;
  [AT_TIMESTAMP]: string;
  [AGENT_NAME]: AgentName;
} & (
  | {
      [PROCESSOR_EVENT]: ProcessorEvent.span;
      [SPAN_SUBTYPE]: string;
    }
  | { [PROCESSOR_EVENT]: ProcessorEvent.transaction }
);

interface Event {
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

const hashCache = new Map<string, string>();

const FNV_32_INIT = 0x811c9dc5;
const FNV_32_PRIME = 0x01000193;

function fnv1a(str: string): number {
  let hash = FNV_32_INIT;
  const len = str.length;

  for (let i = 0; i < len - 3; i += 4) {
    const byte1 = str.charCodeAt(i) & 0xff;
    const byte2 = str.charCodeAt(i + 1) & 0xff;
    const byte3 = str.charCodeAt(i + 2) & 0xff;
    const byte4 = str.charCodeAt(i + 3) & 0xff;

    hash ^= byte1;
    hash = (hash * FNV_32_PRIME) >>> 0;

    hash ^= byte2;
    hash = (hash * FNV_32_PRIME) >>> 0;

    hash ^= byte3;
    hash = (hash * FNV_32_PRIME) >>> 0;

    hash ^= byte4;
    hash = (hash * FNV_32_PRIME) >>> 0;
  }

  for (let i = len - 4; i < len; i++) {
    const byte = str.charCodeAt(i) & 0xff;
    hash ^= byte;
    hash = (hash * FNV_32_PRIME) >>> 0;
  }

  return hash >>> 0; // Ensure a positive 32-bit result
}

function toHash(item: any): string {
  const str = Array.isArray(item)
    ? item.map((p) => p).join('|')
    : typeof item === 'object'
    ? JSON.stringify(item)
    : item;

  const cached = hashCache.get(str);
  if (cached) {
    return cached;
  }

  const result = fnv1a(str).toString(16);
  hashCache.set(str, result);
  return result;
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
  const groupEventsChunked$ = from(chunks).pipe(
    // fechtches from the db in chunks of 50. We need to control the number of parallel operations
    mergeMap((traceIdChunks) => {
      const now = performance.now();
      const response = from(
        fetchCriticalPath({
          traceIds: traceIdChunks,
          start,
          end,
          index,
          filters,
          esqlClient,
        })
      );

      logger.debug(
        `Retrieved critical path in ${performance.now() - now}ms for ${traceIds.length} traces`
      );

      return response;
    }, 2),
    map((response) => {
      const { eventsById, metadataByOperationId } = groupEvents(response.hits);

      const entryIds = getEntryIds({
        eventsById,
        metadataByOperationId,
        serviceName,
        transactionName,
      });

      const eventTrees = getEventTrees({
        eventsById,
        entryIds,
        metadataByOperationId,
      });

      return { eventTrees, metadataByOperationId };
    }),
    // after ALL requests and trees are built, we merge all chunks
    scan(
      (acc, { eventTrees, metadataByOperationId }) => {
        acc.eventTrees.push(...eventTrees);

        for (const [key, value] of metadataByOperationId) {
          if (!acc.metadataByOperationId.has(key)) {
            acc.metadataByOperationId.set(key, value);
          }
        }

        return acc;
      },
      {
        eventTrees: [] as Event[],
        metadataByOperationId: new Map<OperationId, OperationMetadata>(),
      }
    ),
    last(),
    // after the chunks have been merged we build the critical path
    concatMap(({ eventTrees, metadataByOperationId }) =>
      buildCriticalPath$({
        eventTrees,
      }).pipe(
        map((criticalPath) => ({
          ...criticalPath,
          metadataByOperationId,
        }))
      )
    )
  );

  const { metadataByOperationId, timeByNodeId, nodes, rootNodes, operationIdByNodeId } =
    await lastValueFrom(groupEventsChunked$);

  return {
    criticalPath: {
      metadata: Object.fromEntries(metadataByOperationId),
      timeByNodeId: Object.fromEntries(timeByNodeId),
      nodes: Array.from(nodes.entries()).reduce<Record<string, string[]>>((acc, [key, value]) => {
        acc[key] = Array.from(value);
        return acc;
      }, {}),
      rootNodes: Array.from(rootNodes),
      operationIdByNodeId: Object.fromEntries(operationIdByNodeId),
    },
  };
}

const fetchCriticalPath = async ({
  traceIds,
  start,
  end,
  esqlClient,
  filters,
  index,
}: {
  traceIds: string[];
  start: number;
  end: number;
  esqlClient: EsClient;
  filters: QueryDslQueryContainer[];
  index: string[];
}) => {
  // The query does the following:
  // 1. Gets the latest event.duration, agent.name and parent.id for each event.id, event.name, and service.name.
  //  Due to the  lack of esql native aggregation to get the latest value of a field,
  //  we use the EVAL function to create a new field that is a concatenation of the timestamp and the value of the field we want to get the latest value of.
  //  We then use the STATS function to get the latest value of the field by trace ID, event ID, event name, and service name.
  // 2. Groups the events by trace ID, event ID, event name, and service name
  // 3. Sorts the events by parent ID and timestamp. Events without a parent ID are sorted last because they are the root events
  // and there could be many events with the same id. so we get the latest ingested event.
  // 4. Limits the number of events to 10,000 to try to avoid timeouts. This could lead to data loss and incomplete critical paths.
  return esqlClient.esql<QueryResult, { transform: 'plain' }>(
    'get_aggregated_critical_path',
    {
      query: `
        FROM ${index.join(',')}
          | LIMIT 10000
          | EVAL event.id = CASE(processor.event == "span", ${SPAN_ID}, ${TRANSACTION_ID}),
              event.duration = CASE(processor.event == "span", ${SPAN_DURATION}, ${TRANSACTION_DURATION}),
              event.name = CASE(processor.event == "span", ${SPAN_NAME}, ${TRANSACTION_NAME}),
              event.type = CASE(processor.event == "span", ${SPAN_TYPE}, ${TRANSACTION_TYPE})
          | KEEP ${AT_TIMESTAMP},
              event.id,
              event.duration,
              event.name,
              event.type,
              ${SPAN_SUBTYPE},
              ${PROCESSOR_EVENT},
              ${AGENT_NAME},
              ${SERVICE_NAME},
              ${PARENT_ID}
        `,
      filter: {
        bool: {
          filter: [...rangeQuery(start, end), ...termsQuery(TRACE_ID, ...traceIds), ...filters],
        },
      },
    },
    { transform: 'plain' }
  );
};

function getEntryIds({
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

  for (const currentEvent of eventsById.values()) {
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
  }

  return entryIds;
}

function getEventTrees({
  eventsById,
  entryIds,
  metadataByOperationId,
}: {
  eventsById: Map<string, Event>;
  entryIds: Set<string>;
  metadataByOperationId: Map<string, OperationMetadata>;
}) {
  const eventTrees = new Map<string, Event>();
  const events = Array.from(eventsById.values());

  const visited = new Set<string>();

  const childrenByParentId = new Map<string, Event[]>();
  for (const event of events) {
    if (event.parentId) {
      const currentChildren = childrenByParentId.get(event.parentId) || [];
      currentChildren.push(event);
      childrenByParentId.set(event.parentId, currentChildren);
    }
  }

  for (const entry of entryIds) {
    const treeRoot = eventsById.get(entry);
    if (!treeRoot) {
      continue;
    }

    const stack: Array<{ node: Event; parent?: Event }> = [{ node: treeRoot }];

    while (stack.length > 0) {
      const { node, parent } = stack.pop()!;
      visited.add(node.id);

      const { end, offset, skew } = calculateOffsetsAndSkews({
        metadataByOperationId,
        parent,
        event: node,
        startOfTrace: treeRoot.timestamp,
      });

      node.end = end;
      node.offset = offset;
      node.skew = skew;

      const children = childrenByParentId.get(node.id) || [];
      for (const child of children) {
        if (!visited.has(child.id)) {
          stack.push({ node: child, parent: node });
          node.children.push(child);
        }
      }
    }

    eventTrees.set(treeRoot.id, treeRoot);
  }
  return Array.from(eventTrees.values());
}

function calculateOffsetsAndSkews({
  metadataByOperationId,
  event,
  parent,
  startOfTrace,
}: {
  parent?: Event;
  event: Event;
  metadataByOperationId: Map<string, OperationMetadata>;
  startOfTrace: number;
}) {
  const offset = event.timestamp - startOfTrace;
  return {
    skew: calculateClockSkew({ metadataByOperationId, event, parent }),
    offset,
    end: offset + event.skew + event.duration,
  };
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
      id: eventId,
      operationId,
      parentId: hit[PARENT_ID],
      processorEvent: hit[PROCESSOR_EVENT],
      timestamp: new Date(hit[AT_TIMESTAMP]).getTime(),
      duration: hit['event.duration'],
      skew: 0,
      offset: 0,
      end: 0,
      children: [],
    });

    if (!metadataByOperationId.has(operationId)) {
      metadataByOperationId.set(operationId, metadata);
    }
  });

  return { eventsById, metadataByOperationId };
};

function buildCriticalPath$({ eventTrees }: { eventTrees: Event[] }) {
  const initialState = {
    timeByNodeId: new Map<NodeId, number>(),
    nodes: new Map<NodeId, Set<NodeId>>(),
    rootNodes: new Set<NodeId>(),
    operationIdByNodeId: new Map<NodeId, OperationId>(),
  };

  return from(eventTrees).pipe(
    observeOn(asyncScheduler),
    concatMap((treeRoot) => of(treeRoot).pipe(delay(0))),
    concatMap((treeRoot) => {
      const path = buildPathToRoot({ treeRoot });
      const nodeId = toHash(path);

      // Process the tree and mutate the state
      return from(
        new Promise<ReturnType<typeof processTree>>((resolve) => {
          const result = processTree({ treeRoot, nodeId, state: initialState });
          return resolve(result);
        })
      ).pipe(map((state) => ({ ...state, nodeId })));
    }),
    scan((state, { timeByNodeId, nodes, operationIdByNodeId, nodeId }) => {
      state.timeByNodeId = timeByNodeId;
      state.nodes = nodes;
      state.operationIdByNodeId = operationIdByNodeId;

      if (!state.rootNodes.has(nodeId)) {
        state.rootNodes.add(nodeId);
      }

      return state;
    }, initialState)
  );
}

function processTree({
  treeRoot,
  nodeId,
  state,
}: {
  treeRoot: Event;
  nodeId: string;
  state: {
    timeByNodeId: Map<NodeId, number>;
    nodes: Map<NodeId, Set<NodeId>>;
    operationIdByNodeId: Map<NodeId, OperationId>;
  };
}) {
  const stack: Array<{
    currentNode: Event;
    currentNodeId: string;
    startEvent: number;
    endEvent: number;
  }> = [
    {
      currentNode: treeRoot,
      currentNodeId: nodeId,
      startEvent: 0,
      endEvent: treeRoot.duration,
    },
  ];
  const processedNodes = new Set<string>();

  const { timeByNodeId, nodes, operationIdByNodeId } = {
    timeByNodeId: new Map(state.timeByNodeId),
    nodes: new Map(state.nodes),
    operationIdByNodeId: new Map(state.operationIdByNodeId),
  };

  while (stack.length > 0) {
    const { currentNode: currentEvent, currentNodeId, startEvent, endEvent } = stack.pop()!;

    processedNodes.add(currentNodeId);

    const childNodes = new Set(nodes.get(currentNodeId) || []);
    nodes.set(currentNodeId, childNodes);
    operationIdByNodeId.set(currentNodeId, currentEvent.operationId);

    if (currentEvent.children.length === 0) {
      timeByNodeId.set(
        currentNodeId,
        (timeByNodeId.get(currentNodeId) || 0) + (endEvent - startEvent)
      );
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

      const childPath = `${currentNodeId}|${child.operationId}`;
      const childId = toHash(childPath);

      if (!childNodes.has(childId)) {
        childNodes.add(childId);
      }

      if (normalizedChildEnd < scanTime - 1000) {
        timeByNodeId.set(nodeId, (timeByNodeId.get(nodeId) || 0) + (scanTime - normalizedChildEnd));
      }

      scanTime = normalizedChildStart;

      if (!processedNodes.has(childId)) {
        stack.push({
          currentNode: child,
          currentNodeId: childId,
          startEvent: normalizedChildStart,
          endEvent: childEnd,
        });
      }
    }

    if (scanTime > startEvent) {
      timeByNodeId.set(nodeId, (timeByNodeId.get(nodeId) || 0) + (scanTime - startEvent));
    }
  }

  return { timeByNodeId, nodes, operationIdByNodeId };
}

function buildPathToRoot({ treeRoot }: { treeRoot: Event }): string[] {
  const path: string[] = [];
  const stack: Event[] = [treeRoot];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const node = stack.pop()!;
    visited.add(node.id);

    path.push(node.operationId);
    for (const child of node.children) {
      if (!visited.has(child.id)) {
        stack.push(child);
      }
    }
  }

  return path;
}
