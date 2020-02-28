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
import { AlertData, AlertResultList } from '../../../../../common/types';
import { createBrowserHistory } from 'history';
import { mockAlertResultList } from './mock_alert_result_list';
import { HttpHandler, HttpResponse } from 'src/core/public/http';

describe('alert details tests', () => {
  let store: Store<AlertListState, AppAction>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let history: History<never>;
  beforeEach(() => {
    coreStart = coreMock.createStart();
    history = createBrowserHistory();
    const middleware = alertMiddlewareFactory(coreStart);
    store = createStore(alertListReducer, applyMiddleware(middleware));
  });
  describe('when the user is on the alert list page with a selected alert in the url', () => {
    beforeEach(() => {
      const implementation: HttpHandler = async path => {
        // if (path.contains('q9ncfh4q9ctrmc90umcq4')) {
        //   const response: AlertData = mockAlertResultList().alerts[0];
        //   return response;
        // }
        // const response: AlertResultList = mockAlertResultList();
        // return response;
      };
      coreStart.http.get.mockImplementation(implementation);

      // Simulates user navigating to the /alerts page
      store.dispatch({
        type: 'userChangedUrl',
        payload: {
          ...history.location,
          pathname: '/alerts',
          search: '?selected_alert=q9ncfh4q9ctrmc90umcq4',
        },
      });
    });

    it('should return alert details data', () => {
      const actualResponse = store.getState().alertDetails;
      expect(actualResponse).not.toBeUndefined();
    });
  });
});
