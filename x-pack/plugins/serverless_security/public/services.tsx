/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import React from 'react';
import {
  KibanaContextProvider,
  useKibana as useKibanaReact,
} from '@kbn/kibana-react-plugin/public';
import { BrowserRouter } from 'react-router-dom';
import { ServerlessSecurityPluginStartDependencies } from './types';

export type Services = CoreStart & ServerlessSecurityPluginStartDependencies;

// TODO: Replace <BrowserRouter> by <Router history> with global history
export const getKibanaServicesProvider = (
  core: CoreStart,
  pluginsStart: ServerlessSecurityPluginStartDependencies
): React.FC => {
  const services: Services = { ...core, ...pluginsStart };
  return ({ children }) => {
    return (
      <KibanaContextProvider services={services}>
        <BrowserRouter>{children}</BrowserRouter>
      </KibanaContextProvider>
    );
  };
};

export const useKibana = () => useKibanaReact<Services>();
