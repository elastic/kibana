/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as selectors from './selectors';
import { DataState } from '../../types';
import { dataReducer } from './reducer';
import { DataAction } from './action';
import { createStore } from 'redux';
describe('data state', () => {
  let actions: DataAction[] = [];

  /**
   * Get state, given an ordered collection of actions.
   */
  const state: () => DataState = () => {
    const store = createStore(dataReducer);
    for (const action of actions) {
      store.dispatch(action);
    }
    return store.getState();
  };

  /**
   * This prints out all of the properties of the data state.
   * This way we can see the overall behavior of the selector easily.
   */
  const viewAsAString = (dataState: DataState) => {
    return [
      ['is loading', selectors.isLoading(dataState)],
      ['has an error', selectors.hasError(dataState)],
      ['has more children', selectors.hasMoreChildren(dataState)],
      ['has more ancestors', selectors.hasMoreAncestors(dataState)],
      ['document to fetch', selectors.databaseDocumentIDToFetch(dataState)],
      ['requires a pending request to be aborted', selectors.databaseDocumentIDToAbort(dataState)],
    ]
      .map(([message, value]) => `${message}: ${JSON.stringify(value)}`)
      .join('\n');
  };

  it(`shouldn't initially be loading, or have an error, or have more children or ancestors, or have a document to fetch, or have a pending request that needs to be aborted.`, () => {
    expect(viewAsAString(state())).toMatchInlineSnapshot(`
      "is loading: false
      has an error: false
      has more children: false
      has more ancestors: false
      document to fetch: null
      requires a pending request to be aborted: null"
    `);
  });

  describe('when there is a databaseDocumentID but no pending request', () => {
    const databaseDocumentID = 'databaseDocumentID';
    const resolverComponentInstanceID = 'resolverComponentInstanceID';
    beforeEach(() => {
      actions = [
        {
          type: 'appReceivedNewExternalProperties',
          payload: { databaseDocumentID, resolverComponentInstanceID },
        },
      ];
    });
    it('should need to fetch the databaseDocumentID', () => {
      expect(selectors.databaseDocumentIDToFetch(state())).toBe(databaseDocumentID);
    });
    it('should not be loading, have an error, have more children or ancestors, or have a pending request that needs to be aborted.', () => {
      expect(viewAsAString(state())).toMatchInlineSnapshot(`
        "is loading: false
        has an error: false
        has more children: false
        has more ancestors: false
        document to fetch: \\"databaseDocumentID\\"
        requires a pending request to be aborted: null"
      `);
    });
  });
  describe('when there is a pending request but no databaseDocumentID', () => {
    const databaseDocumentID = 'databaseDocumentID';
    beforeEach(() => {
      actions = [
        {
          type: 'appRequestedResolverData',
          payload: databaseDocumentID,
        },
      ];
    });
    it('should be loading', () => {
      expect(selectors.isLoading(state())).toBe(true);
    });
    it('should have a request to abort', () => {
      expect(selectors.databaseDocumentIDToAbort(state())).toBe(databaseDocumentID);
    });
    it('should not have an error, more children, more ancestors, or a document to fetch.', () => {
      expect(viewAsAString(state())).toMatchInlineSnapshot(`
        "is loading: true
        has an error: false
        has more children: false
        has more ancestors: false
        document to fetch: null
        requires a pending request to be aborted: \\"databaseDocumentID\\""
      `);
    });
  });
  describe('when there is a pending request for the current databaseDocumentID', () => {
    const databaseDocumentID = 'databaseDocumentID';
    const resolverComponentInstanceID = 'resolverComponentInstanceID';
    beforeEach(() => {
      actions = [
        {
          type: 'appReceivedNewExternalProperties',
          payload: { databaseDocumentID, resolverComponentInstanceID },
        },
        {
          type: 'appRequestedResolverData',
          payload: databaseDocumentID,
        },
      ];
    });
    it('should be loading', () => {
      expect(selectors.isLoading(state())).toBe(true);
    });
    it('should not have a request to abort', () => {
      expect(selectors.databaseDocumentIDToAbort(state())).toBe(null);
    });
    it('should not have an error, more children, more ancestors, a document to begin fetching, or a pending request that should be aborted.', () => {
      expect(viewAsAString(state())).toMatchInlineSnapshot(`
        "is loading: true
        has an error: false
        has more children: false
        has more ancestors: false
        document to fetch: null
        requires a pending request to be aborted: null"
      `);
    });
    describe('when the pending request fails', () => {
      beforeEach(() => {
        actions.push({
          type: 'serverFailedToReturnResolverData',
          payload: databaseDocumentID,
        });
      });
      it('should not be loading', () => {
        expect(selectors.isLoading(state())).toBe(false);
      });
      it('should have an error', () => {
        expect(selectors.hasError(state())).toBe(true);
      });
      it('should not be loading, have more children, have more ancestors, have a document to fetch, or have a pending request that needs to be aborted.', () => {
        expect(viewAsAString(state())).toMatchInlineSnapshot(`
          "is loading: false
          has an error: true
          has more children: false
          has more ancestors: false
          document to fetch: null
          requires a pending request to be aborted: null"
        `);
      });
    });
  });
  describe('when there is a pending request for a different databaseDocumentID than the current one', () => {
    const firstDatabaseDocumentID = 'first databaseDocumentID';
    const secondDatabaseDocumentID = 'second databaseDocumentID';
    const resolverComponentInstanceID1 = 'resolverComponentInstanceID1';
    const resolverComponentInstanceID2 = 'resolverComponentInstanceID2';
    beforeEach(() => {
      actions = [
        // receive the document ID, this would cause the middleware to starts the request
        {
          type: 'appReceivedNewExternalProperties',
          payload: {
            databaseDocumentID: firstDatabaseDocumentID,
            resolverComponentInstanceID: resolverComponentInstanceID1,
          },
        },
        // this happens when the middleware starts the request
        {
          type: 'appRequestedResolverData',
          payload: firstDatabaseDocumentID,
        },
        // receive a different databaseDocumentID. this should cause the middleware to abort the existing request and start a new one
        {
          type: 'appReceivedNewExternalProperties',
          payload: {
            databaseDocumentID: secondDatabaseDocumentID,
            resolverComponentInstanceID: resolverComponentInstanceID2,
          },
        },
      ];
    });
    it('should be loading', () => {
      expect(selectors.isLoading(state())).toBe(true);
    });
    it('should need to fetch the second databaseDocumentID', () => {
      expect(selectors.databaseDocumentIDToFetch(state())).toBe(secondDatabaseDocumentID);
    });
    it('should need to abort the request for the databaseDocumentID', () => {
      expect(selectors.databaseDocumentIDToFetch(state())).toBe(secondDatabaseDocumentID);
    });
    it('should use the correct location for the second resolver', () => {
      expect(selectors.resolverComponentInstanceID(state())).toBe(resolverComponentInstanceID2);
    });
    it('should not have an error, more children, or more ancestors.', () => {
      expect(viewAsAString(state())).toMatchInlineSnapshot(`
        "is loading: true
        has an error: false
        has more children: false
        has more ancestors: false
        document to fetch: \\"second databaseDocumentID\\"
        requires a pending request to be aborted: \\"first databaseDocumentID\\""
      `);
    });
    describe('and when the old request was aborted', () => {
      beforeEach(() => {
        actions.push({
          type: 'appAbortedResolverDataRequest',
          payload: firstDatabaseDocumentID,
        });
      });
      it('should not require a pending request to be aborted', () => {
        expect(selectors.databaseDocumentIDToAbort(state())).toBe(null);
      });
      it('should have a document to fetch', () => {
        expect(selectors.databaseDocumentIDToFetch(state())).toBe(secondDatabaseDocumentID);
      });
      it('should not be loading', () => {
        expect(selectors.isLoading(state())).toBe(false);
      });
      it('should not have an error, more children, or more ancestors.', () => {
        expect(viewAsAString(state())).toMatchInlineSnapshot(`
          "is loading: false
          has an error: false
          has more children: false
          has more ancestors: false
          document to fetch: \\"second databaseDocumentID\\"
          requires a pending request to be aborted: null"
        `);
      });
      describe('and when the next request starts', () => {
        beforeEach(() => {
          actions.push({
            type: 'appRequestedResolverData',
            payload: secondDatabaseDocumentID,
          });
        });
        it('should not have a document ID to fetch', () => {
          expect(selectors.databaseDocumentIDToFetch(state())).toBe(null);
        });
        it('should be loading', () => {
          expect(selectors.isLoading(state())).toBe(true);
        });
        it('should not have an error, more children, more ancestors, or a pending request that needs to be aborted.', () => {
          expect(viewAsAString(state())).toMatchInlineSnapshot(`
            "is loading: true
            has an error: false
            has more children: false
            has more ancestors: false
            document to fetch: null
            requires a pending request to be aborted: null"
          `);
        });
      });
    });
  });
});
