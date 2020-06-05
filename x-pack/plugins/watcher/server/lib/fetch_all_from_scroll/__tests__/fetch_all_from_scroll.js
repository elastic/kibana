/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { fetchAllFromScroll } from '../fetch_all_from_scroll';
import { set } from 'lodash';

describe('fetch_all_from_scroll', () => {
  let mockResponse;
  let stubCallWithRequest;

  beforeEach(() => {
    mockResponse = {};

    stubCallWithRequest = sinon.stub();
    stubCallWithRequest.onCall(0).returns(
      new Promise((resolve) => {
        const mockInnerResponse = {
          hits: {
            hits: ['newhit'],
          },
          _scroll_id: 'newScrollId',
        };
        return resolve(mockInnerResponse);
      })
    );

    stubCallWithRequest.onCall(1).returns(
      new Promise((resolve) => {
        const mockInnerResponse = {
          hits: {
            hits: [],
          },
        };
        return resolve(mockInnerResponse);
      })
    );
  });

  describe('#fetchAllFromScroll', () => {
    describe('when the passed-in response has no hits', () => {
      beforeEach(() => {
        set(mockResponse, 'hits.hits', []);
      });

      it('should return an empty array of hits', () => {
        return fetchAllFromScroll(mockResponse).then((hits) => {
          expect(hits).to.eql([]);
        });
      });

      it('should not call callWithRequest', () => {
        return fetchAllFromScroll(mockResponse, stubCallWithRequest).then(() => {
          expect(stubCallWithRequest.called).to.be(false);
        });
      });
    });

    describe('when the passed-in response has some hits', () => {
      beforeEach(() => {
        set(mockResponse, 'hits.hits', ['foo', 'bar']);
        set(mockResponse, '_scroll_id', 'originalScrollId');
      });

      it('should return the hits from the response', () => {
        return fetchAllFromScroll(mockResponse, stubCallWithRequest).then((hits) => {
          expect(hits).to.eql(['foo', 'bar', 'newhit']);
        });
      });

      it('should call callWithRequest', () => {
        return fetchAllFromScroll(mockResponse, stubCallWithRequest).then(() => {
          expect(stubCallWithRequest.calledTwice).to.be(true);

          const firstCallWithRequestCallArgs = stubCallWithRequest.args[0];
          expect(firstCallWithRequestCallArgs[1].body.scroll_id).to.eql('originalScrollId');

          const secondCallWithRequestCallArgs = stubCallWithRequest.args[1];
          expect(secondCallWithRequestCallArgs[1].body.scroll_id).to.eql('newScrollId');
        });
      });
    });
  });
});
