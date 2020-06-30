/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createStore, Store } from 'redux';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { mock as mockResolverTree } from '../../models/resolver_tree';
import { dataReducer } from './reducer';
import * as selectors from './selectors';
import { DataState } from '../../types';
import { DataAction } from './action';

/**
 * Test the data reducer and selector.
 */
describe('Resolver Data Middleware', () => {
  let store: Store<DataState, DataAction>;

  beforeEach(() => {
    store = createStore(dataReducer, undefined);
  });

  describe('when data was received and the ancestry and children edges had cursors', () => {
    beforeEach(() => {
      const generator = new EndpointDocGenerator('seed');
      const tree = mockResolverTree({
        events: generator.generateTree({ ancestors: 1, generations: 2, children: 2 }).allEvents,
        cursors: {
          childrenNextChild: 'aValidChildursor',
          ancestryNextAncestor: 'aValidAncestorCursor',
        },
      });
      if (tree) {
        const action: DataAction = {
          type: 'serverReturnedResolverData',
          payload: {
            result: tree,
            databaseDocumentID: '',
          },
        };
        store.dispatch(action);
      }
    });
    it('should indicate there are additional ancestor', () => {
      expect(selectors.hasMoreAncestors(store.getState())).toBe(true);
    });
    it('should indicate there are additional children', () => {
      expect(selectors.hasMoreChildren(store.getState())).toBe(true);
    });
  });
});
