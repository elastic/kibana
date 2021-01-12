/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchAllFromScroll } from './fetch_all_from_scroll';
import { set } from '@elastic/safer-lodash-set';

describe('fetch_all_from_scroll', () => {
  let mockResponse;
  let stubCallWithRequest;

  beforeEach(() => {
    mockResponse = {};

    stubCallWithRequest = jest.fn();

    // TODO: That mocking needs to be migrated to jest
    // stubCallWithRequest.onCall(0).returns(
    //   new Promise((resolve) => {
    //     const mockInnerResponse = {
    //       hits: {
    //         hits: ['newhit'],
    //       },
    //       _scroll_id: 'newScrollId',
    //     };
    //     return resolve(mockInnerResponse);
    //   })
    // );
    //
    // stubCallWithRequest.onCall(1).returns(
    //   new Promise((resolve) => {
    //     const mockInnerResponse = {
    //       hits: {
    //         hits: [],
    //       },
    //     };
    //     return resolve(mockInnerResponse);
    //   })
    // );
  });

  describe('#fetchAllFromScroll', () => {
    describe('when the passed-in response has no hits', () => {
      beforeEach(() => {
        set(mockResponse, 'hits.hits', []);
      });

      it('should return an empty array of hits', () => {
        return fetchAllFromScroll(mockResponse).then((hits) => {
          expect(hits).toEqual([]);
        });
      });

      it('should not call callWithRequest', () => {
        return fetchAllFromScroll(mockResponse, stubCallWithRequest).then(() => {
          expect(stubCallWithRequest).not.toHaveBeenCalled();
        });
      });
    });

    // TODO: tests were not running and are not up to date
    describe.skip('when the passed-in response has some hits', () => {
      beforeEach(() => {
        set(mockResponse, 'hits.hits', ['foo', 'bar']);
        set(mockResponse, '_scroll_id', 'originalScrollId');
      });

      it('should return the hits from the response', () => {
        return fetchAllFromScroll(mockResponse, stubCallWithRequest).then((hits) => {
          expect(hits).toEqual(['foo', 'bar', 'newhit']);
        });
      });

      it('should call callWithRequest', () => {
        return fetchAllFromScroll(mockResponse, stubCallWithRequest).then(() => {
          expect(stubCallWithRequest.calledTwice).toBe(true);

          const firstCallWithRequestCallArgs = stubCallWithRequest.args[0];
          expect(firstCallWithRequestCallArgs[1].body.scroll_id).toEqual('originalScrollId');

          const secondCallWithRequestCallArgs = stubCallWithRequest.args[1];
          expect(secondCallWithRequestCallArgs[1].body.scroll_id).toEqual('newScrollId');
        });
      });
    });
  });
});
