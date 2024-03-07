/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { ConfigSchema } from '../../../../types';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';

export interface PluginContextValue {
  appMountParameters: AppMountParameters<unknown>;
  config: ConfigSchema;
  coreStart: CoreStart;
  isDev?: boolean;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}

export const PluginContext = createContext({} as PluginContextValue);
