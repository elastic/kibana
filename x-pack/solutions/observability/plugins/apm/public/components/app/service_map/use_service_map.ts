/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type {
  ServiceMapNode,
  DestinationService,
  ServiceMapResponse,
} from '../../../../common/service_map/types';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import type { Environment } from '../../../../common/environment_rt';
import {
  getExternalConnectionNode,
  getServiceConnectionNode,
  transformServiceMapResponses,
  getConnections,
} from '../../../../common/service_map';
import type { ConnectionNode, GroupResourceNodesResponse } from '../../../../common/service_map';
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

  const [groupedNodes, setGroupedNodes] = useState<{
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
    [
      license,
      serviceName,
      environment,
      start,
      end,
      serviceGroupId,
      kuery,
      config.serviceMapEnabled,
    ],
    { preservePreviousData: false }
  );

  useEffect(() => {
    if (status === FETCH_STATUS.LOADING) {
      setGroupedNodes((prevState) => ({ ...prevState, status: FETCH_STATUS.LOADING }));
      return;
    }

    if (status === FETCH_STATUS.FAILURE || error) {
      setGroupedNodes({
        data: { elements: [], nodesCount: 0 },
        status: FETCH_STATUS.FAILURE,
        error,
      });
      return;
    }

    if (data) {
      try {
        const transformedData = processServiceMapData(data);
        setGroupedNodes({ data: transformedData, status: FETCH_STATUS.SUCCESS });
      } catch (err) {
        setGroupedNodes({
          data: { elements: [], nodesCount: 0 },
          status: FETCH_STATUS.FAILURE,
          error: err,
        });
      }
    }
  }, [data, status, error]);

  return groupedNodes;
};

const processServiceMapData = (data: ServiceMapResponse): GroupResourceNodesResponse => {
  const paths = buildPaths({ spans: data.spans });
  return transformServiceMapResponses({
    connections: getConnections(paths.connections),
    destinationServices: paths.destinationServices,
    servicesData: data.servicesData,
    anomalies: data.anomalies,
  });
};

const buildPaths = ({ spans }: { spans: ServiceMapNode[] }) => {
  const connections: ConnectionNode[][] = [];
  const discoveredServices: DestinationService[] = [];

  for (const currentNode of spans) {
    const serviceConnectionNode = getServiceConnectionNode(currentNode);
    const externalConnectionNode = getExternalConnectionNode(currentNode);

    if (currentNode.destinationService) {
      discoveredServices.push({
        from: externalConnectionNode,
        to: getServiceConnectionNode(currentNode.destinationService),
      });
    }

    connections.push([serviceConnectionNode, externalConnectionNode]);
  }

  return {
    connections,
    destinationServices: discoveredServices,
  };
};
