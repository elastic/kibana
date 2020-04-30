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
import { AppAction } from '../../store/action';
import { coreMock } from 'src/core/public/mocks';
import { DepsStartMock, depsStartMock } from '../../mocks';
import { createBrowserHistory } from 'history';
import { mockAlertResultList } from './mock_alert_result_list';
import { Immutable } from '../../../../../common/types';

describe('alert details tests', () => {
  let store: Store<Immutable<AlertListState>, Immutable<AppAction>>;
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

    selectorIsTrue = async selector => {
      // If the selector returns true, we're done
      while (selector(store.getState()) !== true) {
        // otherwise, wait til the next state change occurs
        await new Promise(resolve => {
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
          pathname: '/alerts',
          search: '?selected_alert=q9ncfh4q9ctrmc90umcq4',
        },
      });
    });

    it('should return alert details data', async () => {
      // wait for alertDetails to be defined
      await selectorIsTrue(state => state.alertDetails !== undefined);
    });
  });
});
