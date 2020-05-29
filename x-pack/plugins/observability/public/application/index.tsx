/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import { Home } from '../pages/home';
import { PluginContext } from '../context/plugin_context';

export const renderApp = (core: CoreStart, { element }: AppMountParameters) => {
  ReactDOM.render(
    <PluginContext.Provider value={{ core }}>
      <Home />
    </PluginContext.Provider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
