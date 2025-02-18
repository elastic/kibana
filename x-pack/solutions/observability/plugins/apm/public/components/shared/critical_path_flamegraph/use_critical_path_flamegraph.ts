/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-bitwise */

import { useEffect, useRef, useState } from 'react';
import {
  Subscription,
  asyncScheduler,
  concatMap,
  delay,
  filter,
  from,
  last,
  map,
  observeOn,
  of,
  scan,
} from 'rxjs';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { AT_TIMESTAMP } from '../../../../common/es_fields/apm';
import type { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../../common/es_fields/apm';
import { TRANSACTION_NAME, TRANSACTION_TYPE } from '../../../../common/es_fields/apm';
import {
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  AGENT_NAME,
  SERVICE_NAME,
} from '../../../../common/es_fields/apm';
import { PROCESSOR_EVENT } from '../../../../common/es_fields/apm';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import type { CriticalPathResponse } from '../../../../server/routes/traces/get_aggregated_critical_path';
import type {
  CriticalPathMetadata,
  NodeId,
  OperationId,
  OperationMetadata,
} from '../../../../common/critical_path/types';

interface ExternalConnectionNode {
  id: string;
  [SPAN_NAME]: string;
  [SPAN_TYPE]: string;
  [SPAN_SUBTYPE]: string;
  [SPAN_DESTINATION_SERVICE_RESOURCE]: string;
  [AT_TIMESTAMP]: number;
}

interface ServiceConnectionNode {
  id: string;
  [SERVICE_NAME]: string;
  [AGENT_NAME]: string;
  [TRANSACTION_NAME]?: string;
  [TRANSACTION_TYPE]?: string;
  [AT_TIMESTAMP]: number;
}

type OperationNode = ExternalConnectionNode | ServiceConnectionNode;

interface Event {
  id: string;
  parentId?: string;
  destination?: string;
  processorEvent: ProcessorEvent;
  operationId: string;
  operationOriginId: string;
  timestamp: number;
  duration: number;
  skew: number;
  offset?: number;
  end?: number;
  children: Event[];
}

export const useCriticalPath = ({
  start,
  end,
  traceIds,
  traceIdsFetchStatus,
  serviceName,
  transactionName,
}: {
  start: string;
  end: string;
  traceIds: string[];
  traceIdsFetchStatus: FETCH_STATUS;
  serviceName: string | null;
  transactionName: string | null;
}) => {
  const subscriptions = useRef<Subscription>(new Subscription());
  const [groupedNodes, setgGroupedNodes] = useState<{
    data?: CriticalPathMetadata;
    error?: Error | IHttpFetchError<ResponseErrorBody>;
    status: FETCH_STATUS;
  }>({
    status: FETCH_STATUS.LOADING,
  });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!traceIds.length || traceIdsFetchStatus === FETCH_STATUS.LOADING) {
        return Promise.resolve();
      }

      return callApmApi('POST /internal/apm/traces/aggregated_critical_path', {
        params: {
          body: {
            start,
            end,
            traceIds,
            serviceName,
            transactionName,
          },
        },
      });
    },
    [end, serviceName, start, traceIds, traceIdsFetchStatus, transactionName]
  );

  useEffect(() => {
    setgGroupedNodes({ status: FETCH_STATUS.LOADING });

    if (data && status === FETCH_STATUS.SUCCESS) {
      const nodes$ = buildCriticalPath$({
        response: data,
        serviceName,
        transactionName,
      });

      subscriptions.current = nodes$.subscribe({
        next: (nodes) => {
          setgGroupedNodes({
            data: nodes,
            status: FETCH_STATUS.SUCCESS,
          });
        },
        error: (err) => {
          setgGroupedNodes({
            error: err,
            status: FETCH_STATUS.FAILURE,
          });
        },
      });
    }
    return () => {
      subscriptions.current.unsubscribe();
    };
  }, [data, serviceName, status, transactionName]);

  return groupedNodes;
};

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
  const skew = calculateClockSkew({ metadataByOperationId, event, parent });
  return {
    skew,
    offset,
    end: offset + skew + event.duration,
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

export const groupEvents = (response: CriticalPathResponse) => {
  const eventsById = new Map<string, Event>();
  const metadataByOperationId = new Map<OperationId, OperationMetadata>();

  const { path, entryTransactions } = response;

  [...path, ...entryTransactions].forEach((hit) => {
    const eventId = hit.processorEvent === ProcessorEvent.span ? hit.spanId : hit.transactionId;

    const metadata: OperationMetadata = {
      [SERVICE_NAME]: hit.serviceName,
      [AGENT_NAME]: hit.agentName,
      ...(hit.processorEvent === ProcessorEvent.span
        ? {
            [PROCESSOR_EVENT]: ProcessorEvent.span,
            [SPAN_NAME]: hit.spanName,
            [SPAN_TYPE]: hit.spanType,
            [SPAN_SUBTYPE]: hit.spanSubtype,
          }
        : {
            [PROCESSOR_EVENT]: ProcessorEvent.transaction,
            [TRANSACTION_NAME]: hit.transactionName,
            [TRANSACTION_TYPE]: hit.transactionType,
          }),
    };

    const operationId = toHash(metadata);
    const operationOriginId = toHash(
      `${hit.traceId}|${hit.serviceName}${hit.serviceNodeName ? `|${hit.serviceNodeName}` : ''}`
    );

    eventsById.set(eventId, {
      id: eventId,
      operationId,
      parentId: hit.processorEvent === ProcessorEvent.span ? undefined : hit.parentId,
      operationOriginId,
      processorEvent: hit.processorEvent,
      timestamp: new Date(hit.timestamp).getTime(),
      duration:
        hit.processorEvent === ProcessorEvent.span ? hit.spanDuration : hit.transactionDuration,
      skew: 0,
      offset: 0,
      end: 0,
      children: [],
    });

    if (!metadataByOperationId.has(operationId)) {
      metadataByOperationId.set(operationId, metadata);
    }
  });

  return {
    eventsById,
    metadataByOperationId,
  };
};

export function buildPathToRoot({ treeRoot }: { treeRoot: Event }): string[] {
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

export function getChildrenByParentId({ eventsById }: { eventsById: Map<string, Event> }) {
  const events = Array.from(eventsById.values());
  const childrenByParentId = new Map<string, Set<string>>();
  for (const event of events) {
    if (event.parentId) {
      const currentChildren = childrenByParentId.get(event.parentId) ?? new Set();

      currentChildren.add(event.id);
      childrenByParentId.set(event.parentId, currentChildren);
    }
  }

  return childrenByParentId;
}

export function getChildrenByMatchingService({
  unconnectedEvents,
}: {
  unconnectedEvents: Map<string, Event>;
}) {
  const events = Array.from(unconnectedEvents.values());
  const childrenByParentId = new Map<string, Set<string>>();
  for (const event of events) {
    if (event.processorEvent === ProcessorEvent.span) {
      const currentChildren = childrenByParentId.get(event.operationOriginId) ?? new Set();

      currentChildren.add(event.id);
      childrenByParentId.set(event.operationOriginId, currentChildren);
    }
  }

  return childrenByParentId;
}

function getChildren(eventsById: Map<string, Event>) {
  const childrenByParentId = getChildrenByParentId({ eventsById });

  const childrenByOperationId = getChildrenByMatchingService({
    unconnectedEvents: eventsById,
  });

  return (event: Event) => {
    return (
      childrenByParentId.get(event.id) ||
      (event.processorEvent === ProcessorEvent.transaction
        ? childrenByOperationId.get(event.operationOriginId) ?? new Set<string>()
        : new Set<string>())
    );
  };
}

export function getEventTrees({
  eventsById,
  entryIds,
  metadataByOperationId,
}: {
  eventsById: Map<string, Event>;
  entryIds: Set<string>;
  metadataByOperationId: Map<string, OperationMetadata>;
}) {
  const getChildrenForEventFn = getChildren(eventsById);
  const eventTrees: Event[] = [];

  for (const entry of entryIds) {
    const treeRoot = eventsById.get(entry);
    if (!treeRoot) {
      continue;
    }

    const stack: Array<{ node: Event; parent?: Event }> = [{ node: treeRoot }];
    const visited = new Set<string>();

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

      const childrenIds = getChildrenForEventFn(node);

      for (const childId of childrenIds) {
        const child = eventsById.get(childId);

        if (child && !visited.has(childId)) {
          stack.push({ node: child, parent: node });
          node.children.push(child);

          visited.add(childId);
        }
      }
    }

    eventTrees.push(treeRoot);
  }
  return eventTrees;
}

export function buildCriticalPath$({
  response,
  serviceName,
  transactionName,
}: {
  response: CriticalPathResponse;
  serviceName: string | null;
  transactionName: string | null;
}) {
  const initialState = {
    timeByNodeId: new Map<NodeId, number>(),
    nodes: new Map<NodeId, Set<NodeId>>(),
    rootNodes: new Set<NodeId>(),
    operationIdByNodeId: new Map<NodeId, OperationId>(),
  };

  const { eventsById, metadataByOperationId } = groupEvents(response);

  const entryIds = getEntryIds({
    entryTransactions: response.entryTransactions,
    serviceName,
    transactionName,
  });

  const eventTrees = [
    ...getEventTrees({
      eventsById,
      entryIds,
      metadataByOperationId,
    }).values(),
  ];

  return from(eventTrees).pipe(
    filter(() => eventTrees.length > 0),
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
    }, initialState),
    last(),
    map(({ timeByNodeId, nodes, operationIdByNodeId, rootNodes }) => ({
      metadata: Object.fromEntries(metadataByOperationId),
      timeByNodeId: Object.fromEntries(timeByNodeId),
      nodes: Array.from(nodes.entries()).reduce<Record<string, string[]>>((acc, [key, value]) => {
        acc[key] = Array.from(value);
        return acc;
      }, {}),
      rootNodes: Array.from(rootNodes),
      operationIdByNodeId: Object.fromEntries(operationIdByNodeId),
    }))
  );
}

export function getEntryIds({
  entryTransactions,
  serviceName,
  transactionName,
}: {
  entryTransactions: CriticalPathResponse['entryTransactions'];
  serviceName: string | null;
  transactionName: string | null;
}) {
  const entryIds = new Set<string>();

  for (const transaction of entryTransactions) {
    if (
      transaction.serviceName === serviceName &&
      transaction.transactionName === transactionName
    ) {
      entryIds.add(transaction.transactionId);
    } else {
      entryIds.add(transaction.transactionId);
    }
  }

  return entryIds;
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
        (timeByNodeId.get(currentNodeId) ?? 0) + endEvent - startEvent
      );
      continue;
    }

    const children = currentEvent.children.sort((a, b) => (b.end ?? 0) - (a.end ?? 0));
    let intialEndChildTime = endEvent;

    for (const child of children) {
      const normalizedChildStart = Math.max((child.offset || 0) + child.skew, startEvent);
      const childEnd = (child.offset || 0) + child.skew + child.duration;
      const normalizedChildEnd = Math.min(childEnd, intialEndChildTime);

      if (
        // normalizedChildStart >= intialEndChildTime ||
        normalizedChildEnd < startEvent ||
        childEnd > intialEndChildTime
      ) {
        continue;
      }

      const childPath = `${currentNodeId}|${child.operationId}`;
      const childId = toHash(childPath);

      if (!childNodes.has(childId)) {
        childNodes.add(childId);
      }

      if (normalizedChildEnd < intialEndChildTime - 1000) {
        timeByNodeId.set(
          currentNodeId,
          (timeByNodeId.get(currentNodeId) ?? 0) + intialEndChildTime - normalizedChildEnd
        );
      }

      intialEndChildTime = normalizedChildStart;

      if (!processedNodes.has(childId)) {
        stack.push({
          currentNode: child,
          currentNodeId: childId,
          startEvent: normalizedChildStart,
          endEvent: childEnd,
        });
      }
    }

    if (intialEndChildTime > startEvent) {
      timeByNodeId.set(
        currentNodeId,
        (timeByNodeId.get(currentNodeId) || 0) + (intialEndChildTime - startEvent)
      );
    }
  }

  return { timeByNodeId, nodes, operationIdByNodeId };
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
