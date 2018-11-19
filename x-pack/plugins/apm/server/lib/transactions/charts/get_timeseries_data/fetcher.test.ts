/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESResponse, timeseriesFetcher } from './fetcher';

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
        client: clientSpy,
        config: {
          get: () => 'myIndex' as any
        }
      }
    });
  });

  it('should call client with correct query', () => {
    expect(clientSpy.mock.calls).toMatchSnapshot();
  });

  it('should return correct response', () => {
    expect(res).toBe('ES response');
  });
});
