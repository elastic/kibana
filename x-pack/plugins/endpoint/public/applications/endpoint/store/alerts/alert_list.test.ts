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
import { AlertResultList } from '../../../../../common/types';
import { isOnAlertPage } from './selectors';
import { createBrowserHistory } from 'history';
import { mockAlertResultList } from './mock_alert_result_list';

describe('alert list tests', () => {
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
    beforeEach(() => {
      coreStart.http.get.mockImplementation(async () => {
        const response: AlertResultList = mockAlertResultList();
        return response;
      });

      // Simulates user navigating to the /alerts page
      store.dispatch({
        type: 'userChangedUrl',
        payload: {
          ...history.location,
          pathname: '/alerts',
        },
      });
    });

    it("should recognize it's on the alert list page", () => {
      const actual = isOnAlertPage(store.getState());
      expect(actual).toBe(true);
    });

    it('should return alertListData', () => {
      const actualResponseLength = store.getState().alerts.length;
      expect(actualResponseLength).toEqual(1);
    });
  });
});
