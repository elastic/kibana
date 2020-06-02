/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { EuiThemeProvider } from '../../../../legacy/common/eui_styled_components';
import { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import { Home } from '../pages/home';
import { PluginContext } from '../context/plugin_context';

export const renderApp = (core: CoreStart, { element }: AppMountParameters) => {
  const isDarkMode = core.uiSettings.get('theme:darkMode');
  ReactDOM.render(
    <PluginContext.Provider value={{ core }}>
      <EuiThemeProvider darkMode={isDarkMode}>
        <Home />
      </EuiThemeProvider>
    </PluginContext.Provider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
