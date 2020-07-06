/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PROCESSOR_EVENT } from '../../../../../common/elasticsearch_fieldnames';
import { getBuckets } from '../get_buckets';
import { APMConfig } from '../../../..';

describe('timeseriesFetcher', () => {
  let clientSpy: jest.Mock;

  beforeEach(async () => {
    clientSpy = jest.fn().mockResolvedValueOnce({
      hits: {
        total: 100,
      },
      aggregations: {
        distribution: {
          buckets: [],
        },
      },
    });

    await getBuckets({
      serviceName: 'myServiceName',
      bucketSize: 10,
      setup: {
        start: 1528113600000,
        end: 1528977600000,
        client: {
          search: clientSpy,
        } as any,
        internalClient: {
          search: clientSpy,
        } as any,
        config: new Proxy(
          {},
          {
            get: () => 'myIndex',
          }
        ) as APMConfig,
        uiFiltersES: [
          {
            term: { 'service.environment': 'prod' },
          },
        ],
        indices: {
          'apm_oss.sourcemapIndices': 'apm-*',
          'apm_oss.errorIndices': 'apm-*',
          'apm_oss.onboardingIndices': 'apm-*',
          'apm_oss.spanIndices': 'apm-*',
          'apm_oss.transactionIndices': 'apm-*',
          'apm_oss.metricsIndices': 'apm-*',
          apmAgentConfigurationIndex: '.apm-agent-configuration',
          apmCustomLinkIndex: '.apm-custom-link',
        },
      },
    });
  });

  it('should make the correct query', () => {
    expect(clientSpy.mock.calls).toMatchSnapshot();
  });

  it('should limit query results to error documents', () => {
    const query = clientSpy.mock.calls[0][0];
    expect(query.body.query.bool.filter).toEqual(
      expect.arrayContaining([{ term: { [PROCESSOR_EVENT]: 'error' } }])
    );
  });
});
