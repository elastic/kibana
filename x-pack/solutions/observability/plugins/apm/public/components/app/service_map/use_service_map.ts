/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useRef, useState } from 'react';
import { asyncScheduler, last, observeOn, of } from 'rxjs';
import { scan, map, concatMap, Subscription } from 'rxjs';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { ServiceMapResponse, ServiceMapSpan } from '../../../../common/service_map/typings';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
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
  const license = useLicenseContext();
  const { config } = useApmPluginContext();

  const subscriptions = useRef<Subscription>(new Subscription());
  const [groupedNodes, setgGroupedNodes] = useState<{
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

  const { data, status, error } = useFetcher(
    (callApmApi) => {
      // When we don't have a license or a valid license, don't make the request.
      if (!license || !isActivePlatinumLicense(license) || !config.serviceMapEnabled) {
        return;
      }

      return callApmApi('GET /internal/apm/service-map', {
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
    [license, serviceName, environment, start, end, serviceGroupId, kuery, config.serviceMapEnabled]
  );

  useEffect(() => {
    subscriptions.current.unsubscribe();

    if (data) {
      setgGroupedNodes((prevState) => ({ ...prevState, status: FETCH_STATUS.LOADING }));

      const nodes$ = buildServiceMapNodes$(data);

      subscriptions.current = nodes$.subscribe({
        next: (nodes) => {
          setgGroupedNodes({
            data: nodes,
            status,
          });
        },
        error: (err) => {
          setgGroupedNodes({
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
  }, [data, status, error]);

  return groupedNodes;
};

export function buildServiceMapNodes$(response: ServiceMapResponse) {
  return of(response).pipe(
    observeOn(asyncScheduler),
    concatMap(({ spans }) => {
      return of(buildPaths({ spans }));
    }),
    scan(
      (acc, { connections, discoveredServices }) => {
        return {
          connections: acc.connections.concat(Array.from(connections.values())),
          discoveredServices: acc.discoveredServices.concat(
            Array.from(discoveredServices.values())
          ),
        };
      },
      { connections: [], discoveredServices: [] } as {
        connections: ConnectionNode[][];
        discoveredServices: DiscoveredService[];
      }
    ),
    last(),
    map(({ connections, discoveredServices }) => {
      return transformServiceMapResponses({
        connections: getConnections(connections),
        discoveredServices,
        services: response.servicesData,
        anomalies: response.anomalies,
      });
    })
  );
}

const buildPaths = ({ spans }: { spans: ServiceMapSpan[] }) => {
  const connections = new Map<string, ConnectionNode[]>();
  const discoveredServices = new Map<string, DiscoveredService>();

  for (const currentNode of spans) {
    const serviceConnectionNode = getServiceConnectionNode(currentNode);
    const externalConnectionNode = getExternalConnectionNode(currentNode);

    const pathKey = `${getConnectionNodeId(serviceConnectionNode)}|${getConnectionNodeId(
      externalConnectionNode
    )}`;

    if (currentNode.downstreamService) {
      const discoveredServiceKey = `${getConnectionNodeId(externalConnectionNode)}|${
        currentNode.downstreamService.serviceName
      }`;

      if (!discoveredServices.has(discoveredServiceKey)) {
        discoveredServices.set(pathKey, {
          from: externalConnectionNode,
          to: {
            [SERVICE_NAME]: currentNode.downstreamService.serviceName,
            [SERVICE_ENVIRONMENT]: currentNode.downstreamService.serviceEnvironment || null,
            [AGENT_NAME]: currentNode.downstreamService.agentName,
          },
        });
      }
    }

    if (!connections.has(pathKey)) {
      connections.set(pathKey, [serviceConnectionNode, externalConnectionNode]);
    }
  }

  return { connections, discoveredServices };
};
