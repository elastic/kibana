/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ESFilter,
  ESSearchResponse,
  ESSearchRequest,
} from '../../typings/elasticsearch';
import { PromiseReturnType } from '../../typings/common';
import { APMConfig } from '..';

interface Options {
  mockResponse?: (
    request: ESSearchRequest
  ) => ESSearchResponse<unknown, ESSearchRequest>;
}

interface MockSetup {
  start: number;
  end: number;
  apmEventClient: any;
  internalClient: any;
  config: APMConfig;
  uiFiltersES: ESFilter[];
  indices: {
    /* eslint-disable @typescript-eslint/naming-convention */
    'apm_oss.sourcemapIndices': string;
    'apm_oss.errorIndices': string;
    'apm_oss.onboardingIndices': string;
    'apm_oss.spanIndices': string;
    'apm_oss.transactionIndices': string;
    'apm_oss.metricsIndices': string;
    /* eslint-enable @typescript-eslint/naming-convention */
    apmAgentConfigurationIndex: string;
    apmCustomLinkIndex: string;
  };
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

  const mockSetup = {
    start: 1528113600000,
    end: 1528977600000,
    apmEventClient: { search: spy } as any,
    internalClient: { search: spy } as any,
    config: new Proxy(
      {},
      {
        get: (_, key) => {
          switch (key) {
            default:
              return 'myIndex';

            case 'xpack.apm.metricsInterval':
              return 30;
          }
        },
      }
    ) as APMConfig,
    uiFiltersES: [{ term: { 'my.custom.ui.filter': 'foo-bar' } }],
    indices: {
      /* eslint-disable @typescript-eslint/naming-convention */
      'apm_oss.sourcemapIndices': 'myIndex',
      'apm_oss.errorIndices': 'myIndex',
      'apm_oss.onboardingIndices': 'myIndex',
      'apm_oss.spanIndices': 'myIndex',
      'apm_oss.transactionIndices': 'myIndex',
      'apm_oss.metricsIndices': 'myIndex',
      /* eslint-enable @typescript-eslint/naming-convention */
      apmAgentConfigurationIndex: 'myIndex',
      apmCustomLinkIndex: 'myIndex',
    },
    dynamicIndexPattern: null as any,
  };
  try {
    response = await fn(mockSetup);
  } catch (err) {
    error = err;
    // we're only extracting the search params
  }

  return {
    params: spy.mock.calls[0][0],
    response,
    error,
    spy,
    teardown: () => spy.mockClear(),
  };
}

export type SearchParamsMock = PromiseReturnType<typeof inspectSearchParams>;

export function mockNow(date: string | number | Date) {
  const fakeNow = new Date(date).getTime();
  return jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
}
