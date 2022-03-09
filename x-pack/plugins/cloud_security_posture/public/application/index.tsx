/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import { CspApp } from './app';
import type { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import type { CspClientPluginStartDeps } from '../types';

export const renderApp = (
  core: CoreStart,
  deps: CspClientPluginStartDeps,
  params: AppMountParameters
) => {
  ReactDOM.render(
    <KibanaThemeProvider theme$={params.theme$}>
      <CspApp core={core} params={params} deps={deps} />
    </KibanaThemeProvider>,
    params.element
  );

  return () => ReactDOM.unmountComponentAtNode(params.element);
};
