/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { OmitByValue, Assign } from 'utility-types';
import type {
  ClientRequestParamsOf,
  EndpointOf,
  ReturnOf,
} from '@kbn/server-route-repository';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { APMServerRouteRepository } from '../../server';

import type {
  APMClient,
  APMClientOptions,
} from '../services/rest/create_call_apm_api';
import { FetcherResult, FETCH_STATUS, useFetcher } from './use_fetcher';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import {
  apmProgressiveLoading,
  getProbabilityFromProgressiveLoadingQuality,
  ProgressiveLoadingQuality,
} from '../../../observability/common';

type APMProgressivelyLoadingServerRouteRepository = OmitByValue<
  {
    [key in keyof APMServerRouteRepository]: ClientRequestParamsOf<
      APMServerRouteRepository,
      key
    > extends {
      params: { query: { probability: any } };
    }
      ? APMServerRouteRepository[key]
      : undefined;
  },
  undefined
>;

type WithoutProbabilityParameter<T extends Record<string, any>> = {
  params: { query: {} };
} & Assign<
  T,
  {
    params: Omit<T['params'], 'query'> & {
      query: Omit<T['params']['query'], 'probability'>;
    };
  }
>;

type APMProgressiveAPIClient = <
  TEndpoint extends EndpointOf<APMProgressivelyLoadingServerRouteRepository>
>(
  endpoint: TEndpoint,
  options: Omit<APMClientOptions, 'signal'> &
    WithoutProbabilityParameter<
      ClientRequestParamsOf<
        APMProgressivelyLoadingServerRouteRepository,
        TEndpoint
      >
    >
) => Promise<ReturnOf<APMProgressivelyLoadingServerRouteRepository, TEndpoint>>;

function clientWithProbability(
  regularCallApmApi: APMClient,
  probability: number
) {
  return <
    TEndpoint extends EndpointOf<APMProgressivelyLoadingServerRouteRepository>
  >(
    endpoint: TEndpoint,
    options: Omit<APMClientOptions, 'signal'> &
      WithoutProbabilityParameter<
        ClientRequestParamsOf<
          APMProgressivelyLoadingServerRouteRepository,
          TEndpoint
        >
      >
  ) => {
    return regularCallApmApi(endpoint, {
      ...options,
      params: {
        ...options.params,
        query: {
          ...options.params.query,
          probability,
        },
      },
    } as any);
  };
}

export function useProgressiveFetcher<TReturn>(
  callback: (
    callApmApi: APMProgressiveAPIClient
  ) => Promise<TReturn> | undefined,
  dependencies: any[],
  options?: Parameters<typeof useFetcher>[2]
): FetcherResult<TReturn> {
  const {
    services: { uiSettings },
  } = useKibana();

  const progressiveLoadingQuality =
    uiSettings?.get<ProgressiveLoadingQuality>(apmProgressiveLoading) ??
    ProgressiveLoadingQuality.off;

  const sampledProbability = getProbabilityFromProgressiveLoadingQuality(
    progressiveLoadingQuality
  );

  const sampledFetch = useFetcher(
    (regularCallApmApi) => {
      if (progressiveLoadingQuality === ProgressiveLoadingQuality.off) {
        return;
      }
      return callback(
        clientWithProbability(regularCallApmApi, sampledProbability)
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies,
    options
  );

  const unsampledFetch = useFetcher(
    (regularCallApmApi) => {
      return callback(clientWithProbability(regularCallApmApi, 1));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies
  );

  const fetches = [unsampledFetch, sampledFetch];

  const isError = unsampledFetch.status === FETCH_STATUS.FAILURE;

  const usedFetch =
    (!isError &&
      fetches.find((fetch) => fetch.status === FETCH_STATUS.SUCCESS)) ||
    unsampledFetch;

  const status =
    unsampledFetch.status === FETCH_STATUS.LOADING &&
    usedFetch.status === FETCH_STATUS.SUCCESS
      ? FETCH_STATUS.LOADING
      : usedFetch.status;

  return {
    ...usedFetch,
    status,
  };
}
