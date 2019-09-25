/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import { AppMountContext, AppMountParameters } from 'kibana/public';

import { App } from '../../../legacy/plugins/code/public/components/app';
import { store } from '../../../legacy/plugins/code/public/stores';

export const renderApp = (
  context: AppMountContext,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <I18nProvider>
      <Provider store={store}>
        <App />
      </Provider>
    </I18nProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
