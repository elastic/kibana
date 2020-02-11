/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore, applyMiddleware } from 'redux';
import { alertListReducer } from './reducer';
import { AlertListState, EndpointAppHistory } from '../../types';
import { alertMiddlewareFactory } from './middleware';
import { AppAction } from '../action';
import { coreMock } from 'src/core/public/mocks';
import { createBrowserHistory } from 'history';
import { AlertResultList } from '../../../../../common/types';
import { isOnAlertPage } from './selectors';

describe('alert list middleware and selectors', () => {
  let store: Store<AlertListState, AppAction>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let history: EndpointAppHistory;
  beforeEach(() => {
    coreStart = coreMock.createStart();
    history = createBrowserHistory();
    const { middleware } = alertMiddlewareFactory(coreStart, history);
    store = createStore(alertListReducer, applyMiddleware(middleware));
  });
  describe('when the user navigates to the alert list page', () => {
    beforeEach(() => {
      coreStart.http.post.mockImplementation(async () => {
        const response: AlertResultList = {
          alerts: [
            {
              '@timestamp': new Date(0),
              agent: {
                id: 'hgsadfjbk',
                version: 'kdfhjs',
              },
              event: {
                action: 'hjkadfs',
              },
              file_classification: {
                malware_classification: {
                  score: 3,
                },
              },
              host: {
                hostname: 'fdadsf',
                ip: 'asdfasd',
                os: {
                  name: 'asdfsdaf',
                },
              },
              thread: {},
            },
          ],
          total: 1,
          request_page_size: 10,
          request_page_index: 0,
          result_from_index: 0,
        };
        return response;
      });
      store.dispatch({ type: 'userChangedUrl', payload: '/alerts' });
    });

    it("should recognize it's on the alert list page", () => {
      const actual = isOnAlertPage(store.getState());
      expect(actual).toBeTruthy();
    });

    it('should return alertListData', () => {
      const actual = store.getState().alerts.length;
      expect(actual).toEqual(1);
    });
  });
});
