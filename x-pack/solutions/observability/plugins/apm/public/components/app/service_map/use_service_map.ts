/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Observable, of } from 'rxjs';
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
import { chunk } from 'lodash';

import type { Readable } from 'stream';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import type { ServiceMapReponse } from '../../../../common/service_map/transform_service_map_responses';
import type { Environment } from '../../../../common/environment_rt';
import {
  getConnectionNodeId,
  getExternalConnectionNode,
  getServiceConnectionNode,
  transformServiceMapResponses,
  getConnections,
} from '../../../../common/service_map';
import type {
  ConnectionNode,
  DiscoveredService,
  GroupResourceNodesResponse,
} from '../../../../common/service_map';
import { useKibana } from '../../../context/kibana_context/use_kibana';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';

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
              Accept: 'application/octet-stream',
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

    if (traceIdsRequest.status === FETCH_STATUS.SUCCESS && traceIdsRequest.data?.traceIds) {
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

function parseConcatenatedJson(data: string): ServiceMapReponse[] {
  return JSON.parse(data);
}

function processStream(readableStream: Uint8Array) {
  const jsonString = Buffer.from(readableStream).toString('utf-8');

  return [parseConcatenatedJson(jsonString)];
}

export function serviceMapBuilder$(result: Observable<Uint8Array>) {
  return result
    .pipe(
      concatMap((hits) => processStream(hits)),
      concatMap((table) => {
        return of(processList({ list: table }));
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

const processList = ({ list }: { list: ServiceMapReponse[] }) => {
  const paths = new Map<string, ConnectionNode[]>();
  const discoveredServices = new Map<string, DiscoveredService>();

  for (const currentNode of list) {
    const serviceConnectionNode = getServiceConnectionNode(currentNode);
    const externalConnectionNode = getExternalConnectionNode(currentNode);

    const pathKey = `${getConnectionNodeId(serviceConnectionNode)}|${getConnectionNodeId(
      externalConnectionNode
    )}`;

    if (currentNode.downstreamService && !discoveredServices.has(pathKey)) {
      discoveredServices.set(pathKey, {
        from: externalConnectionNode,
        to: {
          [SERVICE_NAME]: currentNode.downstreamService.serviceName,
          [SERVICE_ENVIRONMENT]: currentNode.downstreamService.serviceEnvironment ?? null,
          [AGENT_NAME]: currentNode.downstreamService.agentName,
        },
      });
    }

    if (!paths.has(pathKey)) {
      paths.set(pathKey, [serviceConnectionNode, externalConnectionNode]);
    }
  }

  return { paths, discoveredServices };
};
