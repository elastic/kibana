/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore, applyMiddleware } from 'redux';
import { createBrowserHistory, History } from 'history';

import { coreMock } from '../../../../../../src/core/public/mocks';
import { AlertListState } from '../../../common/endpoint_alerts/types';
import { depsStartMock, DepsStartMock } from '../../common/mock/endpoint';

import { alertListReducer } from './reducer';

import { alertMiddlewareFactory } from './middleware';

import { mockAlertResultList } from './mock_alert_result_list';
import { Immutable } from '../../../common/endpoint/types';

describe('alert details tests', () => {
  let store: Store;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let depsStart: DepsStartMock;
  let history: History<never>;
  /**
   * A function that waits until a selector returns true.
   */
  let selectorIsTrue: (selector: (state: Immutable<AlertListState>) => boolean) => Promise<void>;
  beforeEach(() => {
    coreStart = coreMock.createStart();
    depsStart = depsStartMock();
    history = createBrowserHistory();
    const middleware = alertMiddlewareFactory(coreStart, depsStart);
    store = createStore(alertListReducer, applyMiddleware(middleware));

    selectorIsTrue = async (selector) => {
      // If the selector returns true, we're done
      while (selector(store.getState()) !== true) {
        // otherwise, wait til the next state change occurs
        await new Promise((resolve) => {
          const unsubscribe = store.subscribe(() => {
            unsubscribe();
            resolve();
          });
        });
      }
    };
  });
  describe('when the user is on the alert list page with a selected alert in the url', () => {
    beforeEach(() => {
      const firstResponse: Promise<unknown> = Promise.resolve(mockAlertResultList());
      coreStart.http.get.mockReturnValue(firstResponse);
      depsStart.data.indexPatterns.getFieldsForWildcard.mockReturnValue(Promise.resolve([]));

      // Simulates user navigating to the /alerts page
      store.dispatch({
        type: 'userChangedUrl',
        payload: {
          ...history.location,
          pathname: '/endpoint-alerts',
          search: '?selected_alert=q9ncfh4q9ctrmc90umcq4',
        },
      });
    });

    it('should return alert details data', async () => {
      // wait for alertDetails to be defined
      await selectorIsTrue((state) => state.alertDetails !== undefined);
    });
  });
});
