/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { anomalyAggsFetcher, ESResponse } from './fetcher';

describe('anomalyAggsFetcher', () => {
  describe('when ES returns valid response', () => {
    let response: ESResponse;
    let clientSpy: jest.Mock;

    beforeEach(async () => {
      clientSpy = jest.fn().mockReturnValue('ES Response');
      response = await anomalyAggsFetcher({
        serviceName: 'myServiceName',
        transactionType: 'myTransactionType',
        intervalString: 'myInterval',
        client: clientSpy,
        start: 0,
        end: 1
      });
    });

    it('should call client with correct query', () => {
      expect(clientSpy.mock.calls).toMatchSnapshot();
    });

    it('should return correct response', () => {
      expect(response).toBe('ES Response');
    });
  });

  it('should swallow HTTP errors', () => {
    const httpError = new Error('anomaly lookup failed') as any;
    httpError.statusCode = 418;
    const failClient = jest.fn(() => Promise.reject(httpError));

    return expect(
      anomalyAggsFetcher({ client: failClient } as any)
    ).resolves.toEqual(null);
  });

  it('should throw other errors', () => {
    const otherError = new Error('anomaly lookup ASPLODED') as any;
    const failClient = jest.fn(() => Promise.reject(otherError));

    return expect(
      anomalyAggsFetcher({
        client: failClient
      } as any)
    ).rejects.toThrow(otherError);
  });
});
