/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  from,
  of,
  lastValueFrom,
  map,
  concatMap,
  mergeMap,
  scan,
  delay,
  last,
  asyncScheduler,
  observeOn,
} from 'rxjs';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  AGENT_NAME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';
import type {
  ConnectionNode,
  DiscoveredService,
  ExternalConnectionNode,
  ServiceConnectionNode,
} from '../../../common/service_map';
import type { EsClient } from '../../lib/helpers/get_esql_client';

type QueryResult = {
  'event.id': string;
  [PARENT_ID]?: string;
} & ConnectionNode;

type Node = {
  id: string;
  parentId?: string;
  children: Node[];
} & ConnectionNode;

export async function fetchServicePathsFromTraceIds({
  traceIdChunks,
  start,
  end,
  index,
  filters,
  esqlClient,
  terminateAfter,
}: {
  traceIdChunks: string[][];
  start: number;
  end: number;
  terminateAfter: number;
  esqlClient: EsClient;
  index: string[];
  filters: QueryDslQueryContainer[];
}) {
  const groupEventsChunked$ = from(traceIdChunks).pipe(
    mergeMap((traceIdsChunk) => {
      // filter out spans that don't have a SPAN_DESTINATION_SERVICE_RESOURCE |-> get only transactions and spans that don't have destination
      // return only transaction.id, span.id, span.destination.service.resource, span.subtype,
      // otel only has span.id and span.destination.service.resource
      // resouce.attrbutes.upstream -> to service.name/ downstream.service.name
      return from(
        esqlClient.esql<QueryResult, { transform: 'plain' }>(
          'get_service_paths_from_trace_ids',
          {
            query: `
              FROM ${index.join(',')}
                | LIMIT ${terminateAfter}
                | EVAL event.id = CASE(processor.event == "span", ${SPAN_ID}, ${TRANSACTION_ID})
                | KEEP event.id,
                      ${SPAN_DESTINATION_SERVICE_RESOURCE},
                      ${SPAN_SUBTYPE},
                      ${SPAN_TYPE},
                      ${AGENT_NAME},
                      ${SERVICE_NAME},
                      ${SERVICE_ENVIRONMENT},
                      ${PARENT_ID}
      `,
            filter: {
              bool: {
                filter: [
                  ...rangeQuery(start, end),
                  ...termsQuery(TRACE_ID, ...traceIdsChunk),
                  ...filters,
                ],
              },
            },
          },
          { transform: 'plain' }
        )
      );
    }, 3),
    concatMap(({ hits }) => {
      const eventsById = getEventsById({ response: hits });
      const entryIds = getEntryIds({ eventsById });
      const eventTrees = getEventTrees({ eventsById, entryIds });

      return buildMapPaths$({ eventTrees });
    }),
    scan(
      (acc, { paths, discoveredServices }) => {
        acc.paths = new Map([...acc.paths, ...paths]);
        acc.discoveredServices = new Map([...acc.discoveredServices, ...discoveredServices]);

        return acc;
      },
      {
        paths: new Map<string, ConnectionNode[]>(),
        discoveredServices: new Map<string, DiscoveredService>(),
      }
    ),
    last(),
    map(({ paths, discoveredServices }) => {
      return {
        paths: Array.from(paths.values()),
        discoveredServices: Array.from(discoveredServices.values()),
      };
    })
  );

  const { paths, discoveredServices } = await lastValueFrom(groupEventsChunked$);

  return {
    paths,
    discoveredServices,
  };
}

const isSpan = (node: ConnectionNode): node is ExternalConnectionNode => {
  return !!(node as ExternalConnectionNode)[SPAN_DESTINATION_SERVICE_RESOURCE];
};

function getConnectionNodeId(node: ConnectionNode): string {
  if (isSpan(node)) {
    return node[SPAN_DESTINATION_SERVICE_RESOURCE];
  }
  return node[SERVICE_NAME];
}

const getServiceConnectionNode = (event: Node): ServiceConnectionNode => {
  return {
    [SERVICE_NAME]: event[SERVICE_NAME],
    [SERVICE_ENVIRONMENT]: event[SERVICE_ENVIRONMENT],
    [AGENT_NAME]: event[AGENT_NAME],
  };
};

const getExternalConnectionNode = (event: Node): ExternalConnectionNode => {
  return {
    [SPAN_DESTINATION_SERVICE_RESOURCE]: event[SPAN_DESTINATION_SERVICE_RESOURCE],
    [SPAN_TYPE]: event[SPAN_TYPE],
    [SPAN_SUBTYPE]: event[SPAN_SUBTYPE],
  };
};

function getEventTrees({
  eventsById,
  entryIds,
}: {
  eventsById: Map<string, Node>;
  entryIds: Set<string>;
}) {
  const eventTrees = new Map<string, Node>();
  const events = Array.from(eventsById.values());

  const visited = new Set<string>();

  const childrenByParentId = new Map<string, Node[]>();
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

    const stack: Node[] = [treeRoot];

    while (stack.length > 0) {
      const node = stack.pop()!;
      visited.add(node.id);

      const children = childrenByParentId.get(node.id) || [];
      for (const child of children) {
        if (!visited.has(child.id)) {
          stack.push(child);
          node.children.push(child);
        }
      }
    }

    eventTrees.set(treeRoot.id, treeRoot);
  }

  return Array.from(eventTrees.values());
}

const buildMapPaths$ = ({ eventTrees }: { eventTrees: Node[] }) => {
  const initialState = {
    paths: new Map<string, ConnectionNode[]>(),
    discoveredServices: new Map<string, DiscoveredService>(),
  };

  return from(eventTrees).pipe(
    observeOn(asyncScheduler),
    concatMap((treeRoot) => of(treeRoot).pipe(delay(0))),
    concatMap((treeRoot) => {
      // Process the tree and mutate the state
      return from(
        new Promise<ReturnType<typeof processTree>>((resolve) => {
          const result = processTree({ treeRoot, state: initialState });
          return resolve(result);
        })
      );
    }),
    scan((state, { paths, discoveredServices }) => {
      state.paths = paths;
      state.discoveredServices = discoveredServices;

      return state;
    }, initialState)
  );
};

const processTree = ({
  treeRoot,
  state,
}: {
  treeRoot: Node;
  state: {
    paths: Map<string, ConnectionNode[]>;
    discoveredServices: Map<string, DiscoveredService>;
  };
}) => {
  const visited = new Set<string>();
  const stack: Array<{
    currentNode: Node;
    parentPath: ConnectionNode[];
    currentPathId: string;
    parentNode?: Node;
  }> = [];

  stack.push({
    currentNode: treeRoot,
    parentPath: [],
    currentPathId: '',
  });

  const { paths, discoveredServices } = state;

  while (stack.length > 0) {
    const { currentNode, parentPath, parentNode, currentPathId } = stack.pop()!;
    visited.add(currentNode.id);

    if (
      parentNode &&
      isSpan(parentNode) &&
      (parentNode[SERVICE_NAME] !== currentNode[SERVICE_NAME] ||
        parentNode[SERVICE_ENVIRONMENT] !== currentNode[SERVICE_ENVIRONMENT])
    ) {
      const pathKey = `${getConnectionNodeId(parentNode)}|${getConnectionNodeId(currentNode)}`;
      if (!discoveredServices.has(pathKey)) {
        discoveredServices.set(pathKey, {
          from: getExternalConnectionNode(parentNode),
          to: getServiceConnectionNode(currentNode),
        });
      }
    }

    const currentPath = parentPath.slice();
    const lastEdge = parentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;

    let servicePathId = currentPathId;
    if (
      !lastEdge ||
      !(
        lastEdge[SERVICE_NAME] === currentNode[SERVICE_NAME] &&
        lastEdge[SERVICE_ENVIRONMENT] === currentNode[SERVICE_ENVIRONMENT]
      )
    ) {
      const serviceConnectionNode = getServiceConnectionNode(currentNode);
      servicePathId = `${servicePathId}|${getConnectionNodeId(serviceConnectionNode)}`;
      currentPath.push(serviceConnectionNode);
    }

    if (isSpan(currentNode)) {
      const externalNode = getExternalConnectionNode(currentNode);
      const newPath = [...currentPath, externalNode];
      const pathKey = `${servicePathId}|${getConnectionNodeId(externalNode)}`;

      if (!paths.has(pathKey)) {
        paths.set(pathKey, newPath);
      }
    }

    for (const child of currentNode.children) {
      if (!visited.has(child.id)) {
        stack.push({
          currentNode: child,
          currentPathId: servicePathId,
          parentPath: currentPath,
          parentNode: currentNode,
        });
      }
    }
  }

  return { paths, discoveredServices };
};

function getEventsById({ response }: { response: QueryResult[] }) {
  return response.reduce((acc, hit) => {
    const eventId = hit['event.id'];

    if (!acc.has(eventId)) {
      acc.set(eventId, {
        id: eventId,
        parentId: hit[PARENT_ID],
        [AGENT_NAME]: hit[AGENT_NAME],
        [SERVICE_NAME]: hit[SERVICE_NAME],
        [SERVICE_ENVIRONMENT]: hit[SERVICE_ENVIRONMENT],
        [SPAN_DESTINATION_SERVICE_RESOURCE]: hit[SPAN_DESTINATION_SERVICE_RESOURCE],
        [SPAN_ID]: hit[SPAN_ID],
        [SPAN_SUBTYPE]: hit[SPAN_SUBTYPE],
        children: [],
      });
    }
    return acc;
  }, new Map<string, Node>());
}

function getEntryIds({ eventsById }: { eventsById: Map<string, Node> }) {
  const entryIds = new Set<string>();

  for (const [eventId, event] of eventsById) {
    if (!event.parentId) {
      entryIds.add(eventId);
    }
  }

  return entryIds;
}
