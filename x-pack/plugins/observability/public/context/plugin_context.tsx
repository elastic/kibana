/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import { AppMountParameters, CoreStart } from 'kibana/public';
import { ObservabilityPublicPluginsStart, ObservabilityRuleRegistry } from '../plugin';
import { ConfigSchema } from '..';

export interface PluginContextValue {
  appMountParameters: AppMountParameters;
  config: ConfigSchema;
  core: CoreStart;
  plugins: ObservabilityPublicPluginsStart;
  observabilityRuleRegistry: ObservabilityRuleRegistry;
}

export const PluginContext = createContext({} as PluginContextValue);
