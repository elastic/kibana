/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type {
  ServiceMapSpan,
  ExitSpanDestination,
  ServiceMapRawResponse,
  ServiceMapTelemetry,
} from '../../../../common/service_map/types';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import type { Environment } from '../../../../common/environment_rt';
import {
  getExternalConnectionNode,
  getServiceConnectionNode,
  getServiceMapNodes,
  getConnections,
} from '../../../../common/service_map';
import type { ConnectionNode, GroupResourceNodesResponse } from '../../../../common/service_map';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';

type SeriviceMapState = GroupResourceNodesResponse & Pick<ServiceMapTelemetry, 'tracesCount'>;
const INITIAL_SERVICE_MAP_STATE: SeriviceMapState = {
  elements: [],
  nodesCount: 0,
  tracesCount: 0,
};
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

  const [serviceMapNodes, setServiceMapNodes] = useState<{
    data: SeriviceMapState;
    error?: Error | IHttpFetchError<ResponseErrorBody>;
    status: FETCH_STATUS;
  }>({
    data: INITIAL_SERVICE_MAP_STATE,
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
            useV2: config.ui.serviceMapApiV2Enabled,
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
      config.ui.serviceMapApiV2Enabled,
    ],
    { preservePreviousData: false }
  );

  useEffect(() => {
    if (status === FETCH_STATUS.LOADING) {
      setServiceMapNodes((prevState) => ({ ...prevState, status: FETCH_STATUS.LOADING }));
      return;
    }

    if (status === FETCH_STATUS.FAILURE || error) {
      setServiceMapNodes({
        data: INITIAL_SERVICE_MAP_STATE,
        status: FETCH_STATUS.FAILURE,
        error,
      });
      return;
    }

    if (data) {
      if ('spans' in data) {
        try {
          const transformedData = processServiceMapData(data);
          setServiceMapNodes({
            data: {
              elements: transformedData.elements,
              nodesCount: transformedData.nodesCount,
              tracesCount: data.tracesCount,
            },
            status: FETCH_STATUS.SUCCESS,
          });
        } catch (err) {
          setServiceMapNodes({
            data: INITIAL_SERVICE_MAP_STATE,
            status: FETCH_STATUS.FAILURE,
            error: err,
          });
        }
      } else {
        setServiceMapNodes({
          data,
          status: FETCH_STATUS.SUCCESS,
        });
      }
    }
  }, [data, status, error]);

  return serviceMapNodes;
};

const processServiceMapData = (data: ServiceMapRawResponse): GroupResourceNodesResponse => {
  const paths = getPaths({ spans: data.spans });
  return getServiceMapNodes({
    connections: getConnections(paths.connections),
    exitSpanDestinations: paths.exitSpanDestinations,
    servicesData: data.servicesData,
    anomalies: data.anomalies,
  });
};

const getPaths = ({ spans }: { spans: ServiceMapSpan[] }) => {
  const connections: ConnectionNode[][] = [];
  const exitSpanDestinations: ExitSpanDestination[] = [];

  for (const currentNode of spans) {
    const exitSpanNode = getExternalConnectionNode(currentNode);
    const serviceNode = getServiceConnectionNode(currentNode);

    if (currentNode.destinationService) {
      // maps an exit span to its destination service
      exitSpanDestinations.push({
        from: exitSpanNode,
        to: getServiceConnectionNode(currentNode.destinationService),
      });
    }

    // builds a connection between a service and an exit span
    connections.push([serviceNode, exitSpanNode]);
  }

  return {
    connections,
    exitSpanDestinations,
  };
};
