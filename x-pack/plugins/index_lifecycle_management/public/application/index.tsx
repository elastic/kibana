/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { I18nStart, ScopedHistory, ApplicationStart, ChromeDocTitle } from 'kibana/public';
import { UnmountCallback } from 'src/core/public';

import { App } from './app';
import { indexLifecycleManagementStore } from './store';

interface AppDendencies {
  I18nContext: I18nStart['Context'];
  history: ScopedHistory;
  navigateToApp: ApplicationStart['navigateToApp'];
  docTitle: ChromeDocTitle;
}

export const renderApp = (
  element: Element,
  { history, I18nContext, navigateToApp, docTitle }: AppDendencies
): UnmountCallback => {
  render(
    <I18nContext>
      <Provider store={indexLifecycleManagementStore()}>
        <App history={history} navigateToApp={navigateToApp} docTitle={docTitle} />
      </Provider>
    </I18nContext>,
    element
  );

  return () => unmountComponentAtNode(element);
};
