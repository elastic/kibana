/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchAllFromScroll } from './fetch_all_from_scroll';

describe('fetch_all_from_scroll', () => {
  let stubCallWithRequest: jest.Mock;

  beforeEach(() => {
    stubCallWithRequest = jest.fn();
    stubCallWithRequest
      .mockResolvedValueOnce({
        hits: {
          hits: ['newhit'],
        },
        _scroll_id: 'newScrollId',
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });
  });

  describe('#fetchAllFromScroll', () => {
    describe('when the passed-in response has no hits', () => {
      const mockResponse = {
        hits: {
          hits: [],
        },
      };

      it('should return an empty array of hits', async () => {
        const hits = await fetchAllFromScroll(mockResponse as any, stubCallWithRequest);
        expect(hits).toEqual([]);
      });

      it('should not call callWithRequest', async () => {
        await fetchAllFromScroll(mockResponse as any, stubCallWithRequest);
        expect(stubCallWithRequest).toHaveBeenCalledTimes(0);
      });
    });

    describe('when the passed-in response has some hits', () => {
      const mockResponse = {
        hits: {
          hits: ['foo', 'bar'],
        },
        _scroll_id: 'originalScrollId',
      };

      it('should return the hits from the response', async () => {
        const hits = await fetchAllFromScroll(mockResponse as any, stubCallWithRequest);
        expect(hits).toEqual(['foo', 'bar', 'newhit']);
      });

      it('should call callWithRequest', async () => {
        await fetchAllFromScroll(mockResponse as any, stubCallWithRequest);
        expect(stubCallWithRequest).toHaveBeenCalledTimes(2);

        const firstCallWithRequestCallArgs = stubCallWithRequest.mock.calls[0];
        expect(firstCallWithRequestCallArgs[1].body.scroll_id).toBe('originalScrollId');

        const secondCallWithRequestCallArgs = stubCallWithRequest.mock.calls[1];
        expect(secondCallWithRequestCallArgs[1].body.scroll_id).toBe('newScrollId');
      });
    });
  });
});
