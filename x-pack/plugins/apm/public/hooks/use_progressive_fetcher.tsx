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
import { enableRandomSampling } from '../../../observability/common';

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

const HIGH = 0.001;
const MEDIUM = 0.01;
const LOW = 0.1;
const NONE = 1;

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
  dependencies: any[]
): FetcherResult<TReturn> {
  const {
    services: { uiSettings },
  } = useKibana();

  const isSamplingEnabled =
    uiSettings?.get<boolean>(enableRandomSampling) || false;

  const highFetch = useFetcher(
    (regularCallApmApi) => {
      if (!isSamplingEnabled) {
        return;
      }
      return callback(clientWithProbability(regularCallApmApi, HIGH));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSamplingEnabled, ...dependencies]
  );

  // const mediumFetch = useFetcher(
  //   (regularCallApmApi) => {
  //     if (!isSamplingEnabled) {
  //       return;
  //     }
  //     return callback(clientWithProbability(regularCallApmApi, MEDIUM));
  //   },
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   [isSamplingEnabled, ...dependencies]
  // );

  // const lowFetch = useFetcher(
  //   (regularCallApmApi) => {
  //     if (!isSamplingEnabled) {
  //       return;
  //     }
  //     return callback(clientWithProbability(regularCallApmApi, LOW));
  //   },
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   [isSamplingEnabled, ...dependencies]
  // );

  const noneFetch = useFetcher(
    (regularCallApmApi) => {
      return callback(clientWithProbability(regularCallApmApi, NONE));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies
  );

  const fetches = [
    noneFetch,
    // lowFetch,
    // mediumFetch,
    highFetch,
  ];

  const isError = noneFetch.status === FETCH_STATUS.FAILURE;

  const usedFetch =
    (!isError &&
      fetches.find((fetch) => fetch.status === FETCH_STATUS.SUCCESS)) ||
    noneFetch;

  return {
    ...usedFetch,
    status:
      noneFetch.status === FETCH_STATUS.LOADING &&
      usedFetch.status === FETCH_STATUS.SUCCESS
        ? FETCH_STATUS.LOADING
        : usedFetch.status,
  };
}
