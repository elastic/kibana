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
import type { Storage } from '@kbn/kibana-utils-plugin/public';

import type { ServerlessSecurityPluginStartDependencies } from './types';

export type Services = CoreStart & ServerlessSecurityPluginStartDependencies & { storage: Storage };

export const KibanaServicesProvider: React.FC<{
  core: CoreStart;
  pluginsStart: ServerlessSecurityPluginStartDependencies;
  storage: Storage;
}> = ({ core, pluginsStart, children, storage }) => {
  const services: Services = { ...core, ...pluginsStart, storage };
  return <KibanaContextProvider services={services}>{children}</KibanaContextProvider>;
};

export const useKibana = () => useKibanaReact<Services>();
