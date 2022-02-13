/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMConfig } from '../';
import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../src/core/types/elasticsearch';
import { ApmIndicesConfig } from '../routes/settings/apm_indices/get_apm_indices';
import { UxUIFilters } from '../../common/ux_ui_filter';

interface Options {
  mockResponse?: (
    request: ESSearchRequest
  ) => ESSearchResponse<unknown, ESSearchRequest>;
  uiFilters?: Record<string, string>;
  config?: Partial<APMConfig>;
}

interface MockSetup {
  apmEventClient: any;
  internalClient: any;
  config: APMConfig;
  uiFilters: UxUIFilters;
  indices: ApmIndicesConfig;
}

export async function inspectSearchParams(
  fn: (mockSetup: MockSetup) => Promise<any>,
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

  const mockApmIndices: {
    [Property in keyof APMConfig['indices']]: string;
  } = {
    sourcemap: 'myIndex',
    error: 'myIndex',
    onboarding: 'myIndex',
    span: 'myIndex',
    transaction: 'myIndex',
    metric: 'myIndex',
  };
  const mockSetup = {
    apmEventClient: { search: spy } as any,
    internalClient: { search: spy } as any,
    config: new Proxy(
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
              return mockApmIndices;
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
    ) as APMConfig,
    uiFilters: options?.uiFilters ?? {},
    indices: {
      ...mockApmIndices,
      apmAgentConfigurationIndex: 'myIndex',
      apmCustomLinkIndex: 'myIndex',
    },
  };
  try {
    response = await fn(mockSetup);
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
