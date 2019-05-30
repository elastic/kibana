/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { I18nContext } from 'ui/i18n';

import { App } from './app';
import { remoteClustersStore } from './store';

const ReactApp = () => {
  return (
    <I18nContext>
      <Provider store={remoteClustersStore}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </I18nContext>
  );
};

export const renderReact = async (elem) => {
  render(<ReactApp />, elem);
};
