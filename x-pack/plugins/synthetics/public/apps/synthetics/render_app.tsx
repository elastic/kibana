/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { ClientPluginsSetup, ClientPluginsStart } from '../../plugin';
import { SyntheticsApp } from '../synthetics_app';

export function renderApp(
  core: CoreStart,
  plugins: ClientPluginsSetup,
  startPlugins: ClientPluginsStart,
  appMountParameters: AppMountParameters,
  isDev: boolean
) {
  ReactDOM.render(<SyntheticsApp />, appMountParameters.element);

  return () => {
    ReactDOM.unmountComponentAtNode(appMountParameters.element);
  };
}
