/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { ConfigSchema } from '../';
import { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import { PluginSetupDeps } from '../plugin';

export const renderApp = (
  core: CoreStart,
  deps: PluginSetupDeps,
  { element }: AppMountParameters,
  config: ConfigSchema
) => {
  ReactDOM.render(<div>Hello observability overview</div>, element);
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
