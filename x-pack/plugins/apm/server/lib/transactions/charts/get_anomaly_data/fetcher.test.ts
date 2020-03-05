/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { anomalySeriesFetcher, ESResponse } from './fetcher';

describe('anomalyAggsFetcher', () => {
  describe('when ES returns valid response', () => {
    let response: ESResponse | undefined;
    let clientSpy: jest.Mock;

    beforeEach(async () => {
      clientSpy = jest.fn().mockReturnValue('ES Response');
      response = await anomalySeriesFetcher({
        serviceName: 'myServiceName',
        transactionType: 'myTransactionType',
        intervalString: 'myInterval',
        mlBucketSize: 10,
        setup: {
          client: { search: clientSpy },
          start: 100000,
          end: 200000
        } as any
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
    const failedRequestSpy = jest.fn(() => Promise.reject(httpError));

    return expect(
      anomalySeriesFetcher({
        setup: { client: { search: failedRequestSpy } }
      } as any)
    ).resolves.toEqual(undefined);
  });

  it('should throw other errors', () => {
    const otherError = new Error('anomaly lookup ASPLODED') as any;
    const failedRequestSpy = jest.fn(() => Promise.reject(otherError));

    return expect(
      anomalySeriesFetcher({
        setup: { client: { search: failedRequestSpy } }
      } as any)
    ).rejects.toThrow(otherError);
  });
});
