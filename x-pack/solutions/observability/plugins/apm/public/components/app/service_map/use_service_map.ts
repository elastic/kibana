/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { ReactFlowServiceMapResponse } from '../../../../common/service_map';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import type { Environment } from '../../../../common/environment_rt';
import { transformToReactFlow } from '../../../../common/service_map';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';

const INITIAL_STATE: ReactFlowServiceMapResponse = {
  nodes: [],
  edges: [],
  nodesCount: 0,
  tracesCount: 0,
};

export interface UseServiceMapResult {
  data: ReactFlowServiceMapResponse;
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
  const { config } = useApmPluginContext();

  const [serviceMapNodes, setServiceMapNodes] = useState<UseServiceMapResult>({
    data: INITIAL_STATE,
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
        data: INITIAL_STATE,
        status: FETCH_STATUS.FAILURE,
        error,
      });
      return;
    }

    if (data && 'spans' in data) {
      try {
        const reactFlowData = transformToReactFlow(data);
        setServiceMapNodes({
          data: reactFlowData,
          status: FETCH_STATUS.SUCCESS,
        });
      } catch (err) {
        setServiceMapNodes({
          data: INITIAL_STATE,
          status: FETCH_STATUS.FAILURE,
          error: err,
        });
      }
    }
  }, [data, status, error]);

  return serviceMapNodes;
};
