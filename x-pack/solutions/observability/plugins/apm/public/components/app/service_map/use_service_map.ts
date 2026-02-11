/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type {
  ServiceMapRawResponse,
  ServiceMapTelemetry,
} from '../../../../common/service_map/types';
import type { ReactFlowServiceMapResponse } from '../../../../common/service_map/react_flow_types';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import type { Environment } from '../../../../common/environment_rt';
import { getServiceMapNodes, getPaths, transformToReactFlow } from '../../../../common/service_map';
import type { GroupResourceNodesResponse } from '../../../../common/service_map';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { APM_SERVICE_MAP_USE_REACT_FLOW_FEATURE_FLAG_KEY } from '../../../../common/apm_feature_flags';

// Cytoscape format state (legacy)
type CytoscapeServiceMapState = GroupResourceNodesResponse &
  Pick<ServiceMapTelemetry, 'tracesCount'>;

// React Flow format state (uses the common types)
type ReactFlowServiceMapState = ReactFlowServiceMapResponse;

// Union type for service map state
type ServiceMapState = CytoscapeServiceMapState | ReactFlowServiceMapState;

const INITIAL_CYTOSCAPE_STATE: CytoscapeServiceMapState = {
  elements: [],
  nodesCount: 0,
  tracesCount: 0,
};

const INITIAL_REACT_FLOW_STATE: ReactFlowServiceMapState = {
  nodes: [],
  edges: [],
  nodesCount: 0,
  tracesCount: 0,
};

/**
 * Type guard to check if the state is in React Flow format
 */
export function isReactFlowServiceMapState(
  state: ServiceMapState
): state is ReactFlowServiceMapState {
  return 'nodes' in state && 'edges' in state;
}

/**
 * Type guard to check if the state is in Cytoscape format
 */
export function isCytoscapeServiceMapState(
  state: ServiceMapState
): state is CytoscapeServiceMapState {
  return 'elements' in state;
}

export interface UseServiceMapResult {
  data: ServiceMapState;
  error?: Error | IHttpFetchError<ResponseErrorBody>;
  status: FETCH_STATUS;
}

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
}): UseServiceMapResult => {
  const license = useLicenseContext();
  const {
    config,
    core: { featureFlags },
  } = useApmPluginContext();
  const useReactFlow = featureFlags.getBooleanValue(
    APM_SERVICE_MAP_USE_REACT_FLOW_FEATURE_FLAG_KEY,
    false
  );

  const initialState = useReactFlow ? INITIAL_REACT_FLOW_STATE : INITIAL_CYTOSCAPE_STATE;

  const [serviceMapNodes, setServiceMapNodes] = useState<UseServiceMapResult>({
    data: initialState,
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
      setServiceMapNodes((prevState) => ({ ...prevState, status: FETCH_STATUS.LOADING }));
      return;
    }

    if (status === FETCH_STATUS.FAILURE || error) {
      setServiceMapNodes({
        data: initialState,
        status: FETCH_STATUS.FAILURE,
        error,
      });
      return;
    }

    if (data) {
      if ('spans' in data) {
        try {
          if (useReactFlow) {
            // Transform directly from raw API response to React Flow format
            const reactFlowData = transformToReactFlow(data);
            setServiceMapNodes({
              data: reactFlowData,
              status: FETCH_STATUS.SUCCESS,
            });
          } else {
            // Transform to Cytoscape elements format
            const cytoscapeData = processServiceMapDataCytoscape(data);
            setServiceMapNodes({
              data: {
                elements: cytoscapeData.elements,
                nodesCount: cytoscapeData.nodesCount,
                tracesCount: data.tracesCount,
              },
              status: FETCH_STATUS.SUCCESS,
            });
          }
        } catch (err) {
          setServiceMapNodes({
            data: initialState,
            status: FETCH_STATUS.FAILURE,
            error: err,
          });
        }
      }
    }
  }, [data, status, error, useReactFlow, initialState]);

  return serviceMapNodes;
};

/**
 * Transformation for Cytoscape format
 */
const processServiceMapDataCytoscape = (
  data: ServiceMapRawResponse
): GroupResourceNodesResponse => {
  const paths = getPaths({ spans: data.spans });
  return getServiceMapNodes({
    connections: paths.connections,
    exitSpanDestinations: paths.exitSpanDestinations,
    servicesData: data.servicesData,
    anomalies: data.anomalies,
  });
};
