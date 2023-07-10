/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import {
  KibanaContextProvider,
  useKibana as useKibanaReact,
} from '@kbn/kibana-react-plugin/public';
import type { SecuritySolutionEssPluginStartDeps } from '../types';

export type Services = CoreStart & SecuritySolutionEssPluginStartDeps;

export const KibanaServicesProvider: React.FC<{
  services: Services;
}> = ({ services, children }) => {
  return <KibanaContextProvider services={services}>{children}</KibanaContextProvider>;
};

export const useKibana = () => useKibanaReact<Services>();

export const createServices = (
  core: CoreStart,
  pluginsStart: SecuritySolutionEssPluginStartDeps
): Services => {
  return { ...core, ...pluginsStart };
};
