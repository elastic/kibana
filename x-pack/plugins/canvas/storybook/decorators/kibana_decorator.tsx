/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

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
