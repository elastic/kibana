/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext } from 'react';
import { AppMountParameters, CoreStart } from 'kibana/public';
import { ObservabilityPluginSetupDeps } from '../plugin';

export interface PluginContextValue {
  appMountParameters: AppMountParameters;
  core: CoreStart;
  plugins: ObservabilityPluginSetupDeps;
}

export const PluginContext = createContext({} as PluginContextValue);
