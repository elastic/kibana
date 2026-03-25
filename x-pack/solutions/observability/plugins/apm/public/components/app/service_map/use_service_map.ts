/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MutableRefObject } from 'react';
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

function isReactFlowResponse(value: unknown): value is ReactFlowServiceMapResponse {
  return (
    value != null &&
    typeof value === 'object' &&
    'nodes' in value &&
    Array.isArray((value as ReactFlowServiceMapResponse).nodes) &&
    'edges' in value &&
    Array.isArray((value as ReactFlowServiceMapResponse).edges)
  );
}

function buildCacheKey(params: {
  start: string;
  end: string;
  environment: Environment;
  serviceGroupId?: string;
  kuery: string;
  serviceName?: string;
}): string {
  const { start, end, environment, serviceGroupId, kuery, serviceName } = params;
  return [start, end, environment, serviceGroupId ?? '', kuery, serviceName ?? ''].join('|');
}

export type ServiceMapCache = MutableRefObject<Map<string, ReactFlowServiceMapResponse>>;

export const useServiceMap = ({
  start,
  end,
  environment,
  serviceName,
  serviceGroupId,
  kuery,
  cacheRef,
}: {
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  serviceGroupId?: string;
  serviceName?: string;
  /** When provided, responses are cached by (start,end,env,serviceGroup,kuery,serviceName). Reusing a kuery returns cached data without refetch. */
  cacheRef?: ServiceMapCache;
}): UseServiceMapResult => {
  const license = useLicenseContext();
  const { config } = useApmPluginContext();
  const cacheKey = buildCacheKey({
    start,
    end,
    environment,
    serviceGroupId,
    kuery,
    serviceName,
  });

  const fetcherResult = useFetcher(
    (callApmApi) => {
      if (!license || !isActivePlatinumLicense(license) || !config.serviceMapEnabled) {
        return;
      }

      const cached = cacheRef?.current.get(cacheKey);
      if (cached) {
        return Promise.resolve(cached);
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
      }).then((rawResponse) => {
        const raw = getRawResponse(rawResponse);
        if (raw && typeof raw === 'object' && 'spans' in raw) {
          try {
            const transformed = transformToReactFlow(raw as ServiceMapResponse);
            cacheRef?.current.set(cacheKey, transformed);
            return transformed;
          } catch (err) {
            throw err;
          }
        }
        return rawResponse;
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
      cacheKey,
      cacheRef,
    ],
    { preservePreviousData: false }
  );

  const { data, status, error } = fetcherResult;

  return useMemo((): UseServiceMapResult => {
    if (status === FETCH_STATUS.LOADING) {
      return { data: INITIAL_STATE, status: FETCH_STATUS.LOADING };
    }

    if (status === FETCH_STATUS.FAILURE || error) {
      return {
        data: INITIAL_STATE,
        status: FETCH_STATUS.FAILURE,
        error,
      };
    }

    if (isReactFlowResponse(data)) {
      return { data, status: FETCH_STATUS.SUCCESS };
    }

    const raw = getRawResponse(data);
    if (raw && typeof raw === 'object' && 'spans' in raw) {
      try {
        const reactFlowData = transformToReactFlow(raw as ServiceMapResponse);
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

    return { data: INITIAL_STATE, status: FETCH_STATUS.LOADING };
  }, [data, status, error]);
};
