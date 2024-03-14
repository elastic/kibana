/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { ObservabilityConfig } from '../../..';
import { APMEventClient } from '../lib/helpers/create_es_client/create_apm_event_client';
import { APMInternalESClient } from '../lib/helpers/create_es_client/create_internal_es_client';
import { ApmAlertsClient } from '../lib/helpers/get_apm_alerts_client';

interface Options {
  mockResponse?: (request: ESSearchRequest) => ESSearchResponse<unknown, ESSearchRequest>;
  config?: Partial<ObservabilityConfig>;
}

export async function inspectSearchParams(
  fn: ({
    mockApmEventClient,
    mockConfig,
    mockInternalESClient,
    mockIndices,
    mockApmAlertsClient,
  }: {
    mockApmEventClient: APMEventClient;
    mockConfig: ObservabilityConfig;
    mockInternalESClient: APMInternalESClient;
    mockIndices: APMIndices;
    mockApmAlertsClient: ApmAlertsClient;
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
    [Property in keyof APMIndices]: string;
  } = {
    error: 'myIndex',
    onboarding: 'myIndex',
    span: 'myIndex',
    transaction: 'myIndex',
    metric: 'myIndex',
    sourcemap: 'myIndex',
  };

  const mockConfig = new Proxy(
    {},
    {
      get: (_, key: keyof ObservabilityConfig['apm']) => {
        const config = options?.config?.apm;
        if (!config) return;

        if (config?.[key]) {
          return config?.[key];
        }

        switch (key) {
          default:
            return 'myIndex';
          case 'ui':
            return {
              enabled: true,
              maxTraceItems: 5000,
            };
          case 'metricsInterval':
            return 30;
        }
      },
    }
  ) as ObservabilityConfig;
  const mockInternalESClient = { search: spy } as any;
  const mockApmAlertsClient = { search: spy } as any;

  try {
    response = await fn({
      mockIndices: indices,
      mockApmEventClient,
      mockConfig,
      mockInternalESClient,
      mockApmAlertsClient,
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
