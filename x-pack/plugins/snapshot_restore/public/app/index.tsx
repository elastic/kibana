/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from 'react-dom';
// import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';

// import { App } from './app';
// import { srStore } from './store';

export const renderReact = async (elem: Element, I18nContext: any): void => {
  render(
    <I18nContext>
      {/*<Provider store={srStore}>*/}
      <HashRouter>{/*<App />*/}</HashRouter>
    </I18nContext>,
    elem
  );
};
