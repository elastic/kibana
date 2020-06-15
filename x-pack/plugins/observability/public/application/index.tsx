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
import { getDataHandler } from '../data_handler';

export const renderApp = (core: CoreStart, { element }: AppMountParameters) => {
  const i18nCore = core.i18n;
  const isDarkMode = core.uiSettings.get('theme:darkMode');
  const apmDataHandler = getDataHandler('apm');
  if (apmDataHandler) {
    apmDataHandler
      .fetchData({
        startTime: '2020-06-11T11:34:09.925Z',
        endTime: '2020-06-12T11:34:09.926Z',
        bucketSize: '1',
      })
      .then((value) => {
        console.log('#####', value);
      });
    apmDataHandler.hasData().then((value) => {
      console.log('#####', value);
    });
  }
  ReactDOM.render(
    <PluginContext.Provider value={{ core }}>
      <EuiThemeProvider darkMode={isDarkMode}>
        <i18nCore.Context>
          <Home />
        </i18nCore.Context>
      </EuiThemeProvider>
    </PluginContext.Provider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
