/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '../../../../../../src/core/server/mocks';
import { fetchAllFromScroll } from './fetch_all_from_scroll';

describe('fetch_all_from_scroll', () => {
  let mockScopedClusterClient;

  beforeEach(() => {
    mockScopedClusterClient = elasticsearchClientMock.createElasticsearchClient();
  });

  describe('#fetchAllFromScroll', () => {
    describe('when the passed-in response has no hits', () => {
      const mockSearchResults = {
        hits: {
          hits: [],
        },
      };

      it('should return an empty array of hits', () => {
        return fetchAllFromScroll(mockSearchResults).then((hits) => {
          expect(hits).toEqual([]);
        });
      });

      it('should not call callWithRequest', () => {
        return fetchAllFromScroll(mockSearchResults, mockScopedClusterClient).then(() => {
          expect(mockScopedClusterClient.asCurrentUser).not.toHaveBeenCalled();
        });
      });
    });

    describe('when the passed-in response has some hits', () => {
      const mockInitialSearchResults = {
        hits: {
          hits: ['foo', 'bar'],
        },
        _scroll_id: 'originalScrollId',
      };

      beforeEach(() => {
        const mockResponse1 = {
          hits: {
            hits: ['newHit'],
          },
          _scroll_id: 'newScrollId',
        };

        const mockResponse2 = {
          hits: {
            hits: [],
          },
        };

        mockScopedClusterClient.asCurrentUser.scroll
          .mockReturnValueOnce(Promise.resolve(mockResponse1))
          .mockReturnValueOnce(Promise.resolve(mockResponse2));
      });

      it('should return the hits from the response', () => {
        return fetchAllFromScroll(mockInitialSearchResults, mockScopedClusterClient).then(
          (hits) => {
            expect(hits).toEqual(['foo', 'bar', 'newHit']);
          }
        );
      });

      it('should call callWithRequest', () => {
        return fetchAllFromScroll(mockInitialSearchResults, mockScopedClusterClient).then(() => {
          expect(mockScopedClusterClient.asCurrentUser.scroll).toHaveBeenCalledTimes(2);

          expect(mockScopedClusterClient.asCurrentUser.scroll).toHaveBeenNthCalledWith(1, {
            body: { scroll: '30s', scroll_id: 'originalScrollId' },
          });
          expect(mockScopedClusterClient.asCurrentUser.scroll).toHaveBeenNthCalledWith(2, {
            body: { scroll: '30s', scroll_id: 'newScrollId' },
          });
        });
      });
    });
  });
});
