/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchUrl } from './requests';
import { RegistryError } from '../../../errors';
jest.mock('node-fetch');

const { Response, FetchError } = jest.requireActual('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;

jest.setTimeout(120 * 1000);
describe('setupIngestManager', () => {
  beforeEach(async () => {});

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('fetchUrl / getResponse errors', () => {
    it('regular Errors do not retry. Becomes RegistryError', async () => {
      fetchMock.mockImplementationOnce(() => {
        throw new Error('mocked');
      });
      const promise = fetchUrl('');
      await expect(promise).rejects.toThrow(RegistryError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('TypeErrors do not retry. Becomes RegistryError', async () => {
      fetchMock.mockImplementationOnce(() => {
        // @ts-expect-error
        null.f();
      });
      const promise = fetchUrl('');
      await expect(promise).rejects.toThrow(RegistryError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    describe('only system errors retry (like ECONNRESET)', () => {
      it('they eventually succeed', async () => {
        const successValue = JSON.stringify({ name: 'attempt 4 works', version: '1.2.3' });
        fetchMock
          .mockImplementationOnce(() => {
            throw new FetchError('message 1', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 2', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 3', 'system', { code: 'ESOMETHING' });
          })
          // this one succeeds
          .mockImplementationOnce(() => Promise.resolve(new Response(successValue)))
          .mockImplementationOnce(() => {
            throw new FetchError('message 5', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 6', 'system', { code: 'ESOMETHING' });
          });

        const promise = fetchUrl('');
        await expect(promise).resolves.toEqual(successValue);
        // doesn't retry after success
        expect(fetchMock).toHaveBeenCalledTimes(4);
        const actualResultsOrder = fetchMock.mock.results.map(({ type }: { type: string }) => type);
        expect(actualResultsOrder).toEqual(['throw', 'throw', 'throw', 'return']);
      });

      it('or error after 1 failure & 5 retries with RegistryError', async () => {
        fetchMock
          .mockImplementationOnce(() => {
            throw new FetchError('message 1', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 2', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 3', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 4', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 5', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 6', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 7', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 8', 'system', { code: 'ESOMETHING' });
          });

        const promise = fetchUrl('');
        await expect(promise).rejects.toThrow(RegistryError);
        // doesn't retry after 1 failure & 5 failed retries
        expect(fetchMock).toHaveBeenCalledTimes(6);
        const actualResultsOrder = fetchMock.mock.results.map(({ type }: { type: string }) => type);
        expect(actualResultsOrder).toEqual(['throw', 'throw', 'throw', 'throw', 'throw', 'throw']);
      });
    });
  });
});
