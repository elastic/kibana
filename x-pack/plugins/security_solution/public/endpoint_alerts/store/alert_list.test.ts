/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore, applyMiddleware } from 'redux';
import { History, createBrowserHistory } from 'history';
import { alertListReducer } from './reducer';
import { AlertListState, AlertResultList } from '../../../common/endpoint_alerts/types';
import { alertMiddlewareFactory } from './middleware';
import { coreMock } from 'src/core/public/mocks';
import { DepsStartMock, depsStartMock } from '../../common/mock/endpoint';
import { isOnAlertPage } from './selectors';
import { mockAlertResultList } from './mock_alert_result_list';
import { Immutable } from '../../../common/endpoint/types';

describe('alert list tests', () => {
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
  describe('when the user navigates to the alert list page', () => {
    beforeEach(() => {
      coreStart.http.get.mockImplementation(async () => {
        const response: AlertResultList = mockAlertResultList();
        return response;
      });
      depsStart.data.indexPatterns.getFieldsForWildcard.mockReturnValue(Promise.resolve([]));

      // Simulates user navigating to the /alerts page
      store.dispatch({
        type: 'userChangedUrl',
        payload: {
          ...history.location,
          pathname: '/endpoint-alerts',
        },
      });
    });

    it("should recognize it's on the alert list page", () => {
      const actual = isOnAlertPage(store.getState());
      expect(actual).toBe(true);
    });

    it('should return alertListData', async () => {
      await selectorIsTrue((state) => state.alerts.length === 1);
    });
  });
});
