/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse, timeseriesFetcher } from './fetcher';
import { APMConfig } from '../../../../../server';
import { ProcessorEvent } from '../../../../../common/processor_event';

describe('timeseriesFetcher', () => {
  let res: ESResponse;
  let clientSpy: jest.Mock;
  beforeEach(async () => {
    clientSpy = jest.fn().mockResolvedValueOnce('ES response');

    res = await timeseriesFetcher({
      serviceName: 'myServiceName',
      transactionType: 'myTransactionType',
      transactionName: undefined,
      setup: {
        start: 1528113600000,
        end: 1528977600000,
        apmEventClient: { search: clientSpy } as any,
        internalClient: { search: clientSpy } as any,
        config: new Proxy(
          {},
          {
            get: () => 'myIndex',
          }
        ) as APMConfig,
        uiFilters: {
          environment: 'test',
        },
        esFilter: [
          {
            term: { 'service.environment': 'test' },
          },
        ],
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
      },
      searchAggregatedTransactions: false,
    });
  });

  it('should call client with correct query', () => {
    expect(clientSpy.mock.calls).toMatchSnapshot();
  });

  it('should restrict results to only transaction documents', () => {
    const query = clientSpy.mock.calls[0][0];
    expect(query.apm.events).toEqual([ProcessorEvent.transaction]);
  });

  it('should return correct response', () => {
    expect(res).toBe('ES response');
  });
});
