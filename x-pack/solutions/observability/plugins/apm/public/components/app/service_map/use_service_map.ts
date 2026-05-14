/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type {
  ReactFlowServiceMapResponse,
  ServiceMapResponse,
} from '../../../../common/service_map';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import type { Environment } from '../../../../common/environment_rt';
import { transformToReactFlow } from '../../../../common/service_map';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { filterServiceMapSpansByEnvironment } from './filter_service_map_spans_by_environment';

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

/** Unwrap response in case the API returns { data: ServiceMapResponse } */
function getRawResponse(data: unknown): unknown {
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data;
    if (inner && typeof inner === 'object' && 'spans' in inner) {
      return inner;
    }
  }
  return data;
}

export const useServiceMap = ({
  start,
  end,
  environment,
  serviceName,
  serviceGroupId,
  kuery,
  strictEnvironmentScope,
}: {
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  serviceGroupId?: string;
  serviceName?: string;
  /** Drop cross-env spans before transforming when `environment` is a specific env. */
  strictEnvironmentScope?: boolean;
}): UseServiceMapResult => {
  const license = useLicenseContext();
  const { config } = useApmPluginContext();

  const fetcherResult = useFetcher(
    (callApmApi) => {
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

  const { data, status, error } = fetcherResult;

  return useMemo((): UseServiceMapResult => {
    if (status === FETCH_STATUS.NOT_INITIATED || status === FETCH_STATUS.LOADING) {
      return { data: INITIAL_STATE, status: FETCH_STATUS.LOADING };
    }

    if (status === FETCH_STATUS.FAILURE || error) {
      return {
        data: INITIAL_STATE,
        status: FETCH_STATUS.FAILURE,
        error,
      };
    }

    const raw = getRawResponse(data);
    if (raw && typeof raw === 'object' && 'spans' in raw) {
      try {
        const response = raw as ServiceMapResponse;
        const scopedResponse =
          strictEnvironmentScope && environment !== ENVIRONMENT_ALL.value
            ? {
                ...response,
                spans: filterServiceMapSpansByEnvironment(response.spans, environment),
              }
            : response;
        const reactFlowData = transformToReactFlow(scopedResponse);
        return {
          data: reactFlowData,
          status: FETCH_STATUS.SUCCESS,
        };
      } catch (err) {
        return {
          data: INITIAL_STATE,
          status: FETCH_STATUS.FAILURE,
          error: err as Error,
        };
      }
    }

    return { data: INITIAL_STATE, status: FETCH_STATUS.SUCCESS };
  }, [data, status, error, environment, strictEnvironmentScope]);
};
