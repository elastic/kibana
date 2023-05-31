/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import React from 'react';
import { KibanaContextProvider } from '@kbn/react';
import type { ServerlessObservabilityPluginStartDependencies } from './types';

type Services = CoreStart & ServerlessObservabilityPluginStartDependencies;

export const KibanaServicesProvider: React.FC<{
  core: CoreStart;
  pluginsStart: ServerlessObservabilityPluginStartDependencies;
}> = ({ core, pluginsStart, children }) => {
  const services: Services = { ...core, ...pluginsStart };
  return <KibanaContextProvider services={services}>{children}</KibanaContextProvider>;
};
