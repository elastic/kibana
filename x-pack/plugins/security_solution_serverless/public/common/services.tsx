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

import type { ServerlessSecurityPluginStartDependencies } from '../types';
import { getProjectNavLinks$, type ProjectNavLinks } from './navigation/links';

interface InternalServices {
  getProjectNavLinks$: () => ProjectNavLinks;
}
export type Services = CoreStart & ServerlessSecurityPluginStartDependencies & InternalServices;

export const KibanaServicesProvider: React.FC<{
  services: Services;
}> = ({ services, children }) => {
  return <KibanaContextProvider services={services}>{children}</KibanaContextProvider>;
};

export const useKibana = () => useKibanaReact<Services>();

export const createServices = (
  core: CoreStart,
  pluginsStart: ServerlessSecurityPluginStartDependencies
): Services => {
  const { securitySolution } = pluginsStart;
  const projectNavLinks$ = getProjectNavLinks$(securitySolution.getNavLinks$());
  return { ...core, ...pluginsStart, getProjectNavLinks$: () => projectNavLinks$ };
};
