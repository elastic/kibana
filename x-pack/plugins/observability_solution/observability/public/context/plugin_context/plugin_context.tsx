/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { AppMountParameters } from '@kbn/core/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { ObservabilityRuleTypeRegistry } from '../../rules/create_observability_rule_type_registry';
import type { ConfigSchema } from '../../plugin';

export interface PluginContextValue {
  isDev?: boolean;
  config: ConfigSchema;
  appMountParameters?: AppMountParameters;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
}

export const PluginContext = createContext({} as PluginContextValue);
