/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParams } from 'src/core/public';
import { ClientConfigType } from '../plugin';

import { Main } from './app_search';

export const renderApp = (core: CoreStart, params: AppMountParams, config: ClientConfigType) => {
  ReactDOM.render(<Main http={core.http} appSearchUrl={config.host} />, params.element);
  return () => ReactDOM.unmountComponentAtNode(params.element);
};
