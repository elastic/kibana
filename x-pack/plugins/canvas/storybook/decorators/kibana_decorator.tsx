/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

const settings = new Map();
settings.set('darkMode', true);
const platform = {
  http: {
    basePath: {
      get: () => '',
      prepend: () => '',
      remove: () => '',
      serverBasePath: '',
    },
  },
  uiSettings: settings,
};

export const kibanaContextDecorator = (story: Function) => (
  <KibanaContextProvider services={platform}>{story()}</KibanaContextProvider>
);
