/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore, applyMiddleware } from 'redux';
import { History, createBrowserHistory } from 'history';

import { coreMock } from '../../../../../../src/core/public/mocks';

import { AlertingIndexUIQueryParams } from '../../../common/endpoint_alerts/types';
import { DepsStartMock, depsStartMock } from '../../common/mock/endpoint';

import { alertMiddlewareFactory } from './middleware';

import { alertListReducer } from './reducer';
import { uiQueryParams } from './selectors';
import { urlFromQueryParams } from '../view/url_from_query_params';
import { AppLocation } from './../../../common/endpoint/types';

describe('alert list pagination', () => {
  let store: Store;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let depsStart: DepsStartMock;
  let history: History<AppLocation['state']>;
  let queryParams: () => AlertingIndexUIQueryParams;
  /**
   * Update the history with a new `AlertingIndexUIQueryParams`
   */
  let historyPush: (params: AlertingIndexUIQueryParams) => void;
  beforeEach(() => {
    coreStart = coreMock.createStart();
    depsStart = depsStartMock();
    history = createBrowserHistory();

    const middleware = alertMiddlewareFactory(coreStart, depsStart);
    store = createStore(alertListReducer, applyMiddleware(middleware));

    history.listen((location) => {
      store.dispatch({ type: 'userChangedUrl', payload: location });
    });

    queryParams = () => uiQueryParams(store.getState());

    historyPush = (nextQueryParams: AlertingIndexUIQueryParams): void => {
      return history.push(urlFromQueryParams(nextQueryParams));
    };
  });
  describe('when the user navigates to the alert list page', () => {
    describe('when a new page size is passed', () => {
      beforeEach(() => {
        historyPush({ ...queryParams(), page_size: '1' });
      });
      it('should modify the url correctly', () => {
        expect(queryParams()).toMatchInlineSnapshot(`
          Object {
            "page_size": "1",
          }
        `);
      });

      describe('and then a new page index is passed', () => {
        beforeEach(() => {
          historyPush({ ...queryParams(), page_index: '1' });
        });
        it('should modify the url in the correct order', () => {
          expect(queryParams()).toMatchInlineSnapshot(`
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
        historyPush({ ...queryParams(), page_index: '1' });
      });
      it('should modify the url correctly', () => {
        expect(queryParams()).toMatchInlineSnapshot(`
          Object {
            "page_index": "1",
          }
        `);
      });
    });
  });
});
