/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore, applyMiddleware } from 'redux';
import { History } from 'history';
import { alertListReducer } from './reducer';
import { AlertListState } from '../../types';
import { alertMiddlewareFactory } from './middleware';
import { AppAction } from '../action';
import { coreMock } from 'src/core/public/mocks';
import { createBrowserHistory } from 'history';
import {
  urlFromNewPageSizeParam,
  paginationDataFromUrl,
  urlFromNewPageIndexParam,
} from './selectors';

describe('alert list pagination', () => {
  let store: Store<AlertListState, AppAction>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let history: History<never>;
  beforeEach(() => {
    coreStart = coreMock.createStart();
    history = createBrowserHistory();
    const middleware = alertMiddlewareFactory(coreStart);
    store = createStore(alertListReducer, applyMiddleware(middleware));
  });
  describe('when the user navigates to the alert list page', () => {
    describe('when a new page size is passed', () => {
      beforeEach(() => {
        const urlPageSizeSelector = urlFromNewPageSizeParam(store.getState());
        history.push(urlPageSizeSelector(1));
        store.dispatch({ type: 'userChangedUrl', payload: history.location });
      });
      it('should modify the url correctly', () => {
        const actualPaginationQuery = paginationDataFromUrl(store.getState());
        expect(actualPaginationQuery).toMatchInlineSnapshot(`
          Object {
            "page_size": "1",
          }
        `);
      });

      describe('and then a new page index is passed', () => {
        beforeEach(() => {
          const urlPageIndexSelector = urlFromNewPageIndexParam(store.getState());
          history.push(urlPageIndexSelector(1));
          store.dispatch({ type: 'userChangedUrl', payload: history.location });
        });
        it('should modify the url in the correct order', () => {
          const actualPaginationQuery = paginationDataFromUrl(store.getState());
          expect(actualPaginationQuery).toMatchInlineSnapshot(`
            Object {
              "page_index": "1",
              "page_size": "1",
            }
          `);
        });
      });
    });

    describe('when a new page index is passed', () => {
      beforeEach(() => {
        const urlPageIndexSelector = urlFromNewPageIndexParam(store.getState());
        history.push(urlPageIndexSelector(1));
        store.dispatch({ type: 'userChangedUrl', payload: history.location });
      });
      it('should modify the url correctly', () => {
        const actualPaginationQuery = paginationDataFromUrl(store.getState());
        expect(actualPaginationQuery).toMatchInlineSnapshot(`
          Object {
            "page_index": "1",
          }
        `);
      });

      describe('and then a new page size is passed', () => {
        beforeEach(() => {
          const urlPageSizeSelector = urlFromNewPageSizeParam(store.getState());
          history.push(urlPageSizeSelector(1));
          store.dispatch({ type: 'userChangedUrl', payload: history.location });
        });
        it('should modify the url correctly and reset index to `0`', () => {
          const actualPaginationQuery = paginationDataFromUrl(store.getState());
          expect(actualPaginationQuery).toMatchInlineSnapshot(`
            Object {
              "page_index": "0",
              "page_size": "1",
            }
          `);
        });
      });
    });
  });
});
