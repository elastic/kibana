/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { Observable } from 'rxjs';
import {
  from,
  scan,
  map,
  concatMap,
  last,
  Subscription,
  lastValueFrom,
  mergeMap,
  defer,
  switchMap,
} from 'rxjs';
import * as arrow from 'apache-arrow';
import { chunk } from 'lodash';
import type { Readable } from 'stream';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { Environment } from '../../../../common/environment_rt';
import {
  AGENT_NAME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_SUBTYPE,
} from '../../../../common/es_fields/apm';
import {
  getConnectionNodeId,
  getExternalConnectionNode,
  getServiceConnectionNode,
  isSpan,
  transformServiceMapResponses,
  getConnections,
} from '../../../../common/service_map';
import type {
  ConnectionNode,
  DiscoveredService,
  GroupResourceNodesResponse,
  NodeItem,
} from '../../../../common/service_map';

import { useKibana } from '../../../context/kibana_context/use_kibana';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';

type QueryResult = {
  'event.id': string;
  [PARENT_ID]?: string;
} & ConnectionNode;

export const useServiceMap = ({
  start,
  end,
  environment,
  serviceName,
  serviceGroupId,
  kuery,
}: {
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  serviceGroupId?: string;
  serviceName?: string;
}) => {
  const {
    services: { http },
  } = useKibana();

  const subscriptions = useRef<Subscription>(new Subscription());
  const [data, setData] = useState<{
    data: GroupResourceNodesResponse;
    error?: Error | IHttpFetchError<ResponseErrorBody>;
    status: FETCH_STATUS;
  }>({
    data: {
      elements: [],
      nodesCount: 0,
    },
    status: FETCH_STATUS.LOADING,
  });

  const traceIdsRequest = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/service-map/trace-sample', {
        isCachable: false,
        params: {
          query: {
            start,
            end,
            environment,
            serviceName,
            serviceGroup: serviceGroupId,
            kuery,
          },
        },
      });
    },
    [serviceName, environment, start, end, serviceGroupId, kuery]
  );

  const fetchServiceMap = useCallback(
    async (traceIds: string[]) => {
      return lastValueFrom(
        defer(() => {
          return http.fetch<any>('/internal/apm/service-map', {
            method: 'GET',
            rawResponse: true,
            headers: {
              Accept: 'application/vnd.apache.arrow.stream',
              'Transfer-Encoding': 'chunked',
            },
            query: {
              start,
              end,
              traceIds,
            },
            asResponse: true,
          });
        }).pipe(
          switchMap((r) => streamIntoObservable(r.response?.body as any)),
          scan((acc: Uint8Array, current: Uint8Array) => {
            const concatenated = new Uint8Array(acc.length + current.length);
            concatenated.set(acc, 0);
            concatenated.set(current, acc.length);
            return concatenated;
          }, new Uint8Array())
        )
      );
    },
    [http, start, end]
  );

  useEffect(() => {
    subscriptions.current.unsubscribe();

    if (traceIdsRequest.status === FETCH_STATUS.SUCCESS) {
      const traceIdChunks = chunk(traceIdsRequest.data?.traceIds ?? [], 50);
      setData({
        data: {
          elements: [],
          nodesCount: 0,
        },
        status: FETCH_STATUS.LOADING,
      });

      const serviceMap$ = serviceMapBuilder$(
        from(traceIdChunks).pipe(mergeMap((traceIds) => from(fetchServiceMap(traceIds)), 3))
      );

      subscriptions.current = serviceMap$.subscribe({
        next: (svcMap) => {
          setData({
            data: svcMap,
            status: FETCH_STATUS.SUCCESS,
          });
        },
        error: (err) => {
          setData({
            data: {
              elements: [],
              nodesCount: 0,
            },
            status: FETCH_STATUS.FAILURE,
            error: err,
          });
        },
      });
    }
    return () => {
      subscriptions.current.unsubscribe();
    };
  }, [traceIdsRequest.data, fetchServiceMap, traceIdsRequest.status]);

  return data;
};

function streamIntoObservable(readable?: Readable): Observable<Uint8Array> {
  if (!readable) {
    return new Observable((subscriber) => {
      subscriber.complete();
    });
  }
  return new Observable<Uint8Array>((subscriber) => {
    const decodedStream = readable;

    async function process() {
      for await (const item of decodedStream) {
        subscriber.next(item);
      }
    }

    process()
      .then(() => {
        subscriber.complete();
      })
      .catch((error) => {
        subscriber.error(error);
      });
  });
}

function processTable(table: arrow.RecordBatch): QueryResult[] {
  const response: QueryResult[] = [];

  for (let i = 0; i < table.numRows; i++) {
    const row = table.schema.fields.reduce((acc, field) => {
      const child = table.getChild(field.name)!;
      acc[field.name as string] = child.get(i);
      return acc;
    }, {} as QueryResult);

    response.push(row);
  }

  return response;
}

async function processStream(readableStream: Uint8Array) {
  const reader = await arrow.RecordBatchStreamReader.from(readableStream);

  const response: QueryResult[] = [];

  while (true) {
    const batch = await reader.next();
    if (batch.done) break;

    response.push(...processTable(batch.value));
  }

  return response;
}

export function serviceMapBuilder$(result: Observable<Uint8Array>) {
  return result
    .pipe(
      concatMap((hits) => processStream(hits)),
      concatMap((table) => {
        const eventsById = getEventsById({ response: table });
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
          connections: getConnections(Array.from(paths.values())),
          discoveredServices: Array.from(discoveredServices.values()),
        };
      })
    )
    .pipe(
      map(({ connections, discoveredServices }) =>
        transformServiceMapResponses({
          connections,
          discoveredServices,
          services: [],
          anomalies: {
            mlJobIds: [],
            serviceAnomalies: [],
          },
        })
      )
    );
}

function getEventTrees({
  eventsById,
  entryIds,
}: {
  eventsById: Map<string, NodeItem>;
  entryIds: Set<string>;
}) {
  const eventTrees = new Map<string, NodeItem>();
  const events = Array.from(eventsById.values());

  const visited = new Set<string>();

  const childrenByParentId = new Map<string, NodeItem[]>();
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

    const stack: NodeItem[] = [treeRoot];

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

const buildMapPaths$ = ({ eventTrees }: { eventTrees: NodeItem[] }) => {
  const initialState = {
    paths: new Map<string, ConnectionNode[]>(),
    discoveredServices: new Map<string, DiscoveredService>(),
  };

  return from(eventTrees).pipe(
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
  treeRoot: NodeItem;
  state: {
    paths: Map<string, ConnectionNode[]>;
    discoveredServices: Map<string, DiscoveredService>;
  };
}) => {
  const visited = new Set<string>();
  const stack: Array<{
    currentNode: NodeItem;
    parentPath: ConnectionNode[];
    currentPathId: string;
    parentNode?: NodeItem;
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
  }, new Map<string, NodeItem>());
}

function getEntryIds({ eventsById }: { eventsById: Map<string, NodeItem> }) {
  const entryIds = new Set<string>();

  for (const [eventId, event] of eventsById) {
    if (!event.parentId) {
      entryIds.add(eventId);
    }
  }

  return entryIds;
}
