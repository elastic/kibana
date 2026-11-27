/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { getAllEnvironments } from './get_all_environments';
import type { SearchParamsMock } from '../../utils/test_helpers';
import { inspectSearchParams } from '../../utils/test_helpers';

function mockResponse({
  serviceEnvironments,
  otelEnvironments,
  missingCount,
}: {
  serviceEnvironments: string[];
  otelEnvironments: string[];
  missingCount?: number;
}) {
  return () =>
    ({
      aggregations: {
        environments: { buckets: serviceEnvironments.map((key) => ({ key })) },
        otelEnvironments: { buckets: otelEnvironments.map((key) => ({ key })) },
        ...(missingCount === undefined ? {} : { missingEnvironments: { doc_count: missingCount } }),
      },
    }) as unknown as ESSearchResponse<unknown, ESSearchRequest>;
}

describe('getAllEnvironments', () => {
  let mock: SearchParamsMock;

  afterEach(() => {
    mock.teardown();
  });

  it('merges environments from service.environment and deployment.environment.name', async () => {
    mock = await inspectSearchParams(
      ({ mockApmEventClient }) =>
        getAllEnvironments({
          searchAggregatedTransactions: false,
          serviceName: 'test',
          apmEventClient: mockApmEventClient,
          size: 50,
        }),
      {
        mockResponse: mockResponse({
          serviceEnvironments: ['production', 'staging'],
          otelEnvironments: ['dev', 'production'],
        }),
      }
    );

    expect(mock.response).toEqual(['production', 'staging', 'dev']);
  });

  it('appends ENVIRONMENT_NOT_DEFINED only when documents have neither environment field', async () => {
    const getEnvironments = (missingCount: number) =>
      inspectSearchParams(
        ({ mockApmEventClient }) =>
          getAllEnvironments({
            includeMissing: true,
            searchAggregatedTransactions: false,
            serviceName: 'test',
            apmEventClient: mockApmEventClient,
            size: 50,
          }),
        {
          mockResponse: mockResponse({
            serviceEnvironments: ['production'],
            otelEnvironments: [],
            missingCount,
          }),
        }
      );

    mock = await getEnvironments(3);
    expect(mock.response).toEqual(['production', ENVIRONMENT_NOT_DEFINED.value]);

    mock = await getEnvironments(0);
    expect(mock.response).toEqual(['production']);
  });

  it('fetches all environments', async () => {
    mock = await inspectSearchParams(({ mockApmEventClient }) =>
      getAllEnvironments({
        searchAggregatedTransactions: false,
        serviceName: 'test',
        apmEventClient: mockApmEventClient,
        size: 50,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });

  it('fetches all environments with includeMissing', async () => {
    mock = await inspectSearchParams(({ mockApmEventClient }) =>
      getAllEnvironments({
        includeMissing: true,
        searchAggregatedTransactions: false,
        serviceName: 'test',
        apmEventClient: mockApmEventClient,
        size: 50,
      })
    );

    expect(mock.params).toMatchSnapshot();
  });
});
