/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import { APMConfig } from '..';
import { APMEventClient } from '../lib/helpers/create_es_client/create_apm_event_client';
import { APMInternalESClient } from '../lib/helpers/create_es_client/create_internal_es_client';
import { ApmIndicesConfig } from '../routes/settings/apm_indices/get_apm_indices';

interface Options {
  mockResponse?: (
    request: ESSearchRequest
  ) => ESSearchResponse<unknown, ESSearchRequest>;
  config?: Partial<APMConfig>;
}

export async function inspectSearchParams(
  fn: ({
    mockApmEventClient,
    mockConfig,
    mockInternalESClient,
    mockIndices,
  }: {
    mockApmEventClient: APMEventClient;
    mockConfig: APMConfig;
    mockInternalESClient: APMInternalESClient;
    mockIndices: ApmIndicesConfig;
  }) => Promise<any>,
  options: Options = {}
) {
  const spy = jest.fn().mockImplementation(async (request) => {
    return options.mockResponse
      ? options.mockResponse(request)
      : {
          hits: {
            hits: {
              total: {
                value: 0,
              },
            },
          },
        };
  });

  let response;
  let error;
  const mockApmEventClient = { search: spy } as any;
  const indices: {
    [Property in keyof APMConfig['indices']]: string;
  } = {
    sourcemap: 'myIndex',
    error: 'myIndex',
    onboarding: 'myIndex',
    span: 'myIndex',
    transaction: 'myIndex',
    metric: 'myIndex',
  };
  const mockConfig = new Proxy(
    {},
    {
      get: (_, key: keyof APMConfig) => {
        const { config } = options;
        if (config?.[key]) {
          return config?.[key];
        }

        switch (key) {
          default:
            return 'myIndex';
          case 'indices':
            return indices;
          case 'ui':
            return {
              enabled: true,
              transactionGroupBucketSize: 1000,
              maxTraceItems: 1000,
            };
          case 'metricsInterval':
            return 30;
        }
      },
    }
  ) as APMConfig;
  const mockInternalESClient = { search: spy } as any;
  const mockIndices = {
    ...indices,
    apmAgentConfigurationIndex: 'myIndex',
    apmCustomLinkIndex: 'myIndex',
  };
  try {
    response = await fn({
      mockIndices,
      mockApmEventClient,
      mockConfig,
      mockInternalESClient,
    });
  } catch (err) {
    error = err;
    // we're only extracting the search params
  }

  return {
    params: spy.mock.calls[0]?.[1],
    response,
    error,
    spy,
    teardown: () => spy.mockClear(),
  };
}

export type SearchParamsMock = Awaited<ReturnType<typeof inspectSearchParams>>;

export function mockNow(date: string | number | Date) {
  const fakeNow = new Date(date).getTime();
  return jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
}
