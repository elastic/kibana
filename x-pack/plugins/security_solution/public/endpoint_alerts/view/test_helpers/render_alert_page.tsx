/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { Provider } from 'react-redux';
import { I18nProvider } from '@kbn/i18n/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { AlertIndex } from '../index';
import { RouteCapture } from '../../../common/components/endpoint/route_capture';
import { depsStartMock } from '../../../common/mock/endpoint';
import { createStore } from '../../../common/store';
import {
  SUB_PLUGINS_REDUCER,
  mockGlobalState,
  apolloClientObservable,
  createSecuritySolutionStorageMock,
} from '../../../common/mock';

export const alertPageTestRender = () => {
  /**
   * Create a 'history' instance that is only in-memory and causes no side effects to the testing environment.
   */
  const history = createMemoryHistory<never>();
  /**
   * Create a store, with the middleware disabled. We don't want side effects being created by our code in this test.
   */
  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, apolloClientObservable, storage);

  const depsStart = depsStartMock();
  depsStart.data.ui.SearchBar.mockImplementation(() => <div />);
  const uiSettings = new Map();

  return {
    store,
    history,
    depsStart,

    /**
     * Render the test component, use this after setting up anything in `beforeEach`.
     */
    render: () => {
      /**
       * Provide the store via `Provider`, and i18n APIs via `I18nProvider`.
       * Use react-router via `Router`, passing our in-memory `history` instance.
       * Use `RouteCapture` to emit url-change actions when the URL is changed.
       * Finally, render the `AlertIndex` component which we are testing.
       */
      return reactTestingLibrary.render(
        <Provider store={store}>
          <KibanaContextProvider services={{ data: depsStart.data, uiSettings }}>
            <I18nProvider>
              <Router history={history}>
                <RouteCapture>
                  <AlertIndex />
                </RouteCapture>
              </Router>
            </I18nProvider>
          </KibanaContextProvider>
        </Provider>
      );
    },
  };
};
