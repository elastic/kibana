/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createContext } from 'react';
import type { ConfigSchema } from '..';
import type { CoreStart } from '../../../../../src/core/public/types';
import type { AppMountParameters } from '../../../../../src/core/public/application/types';
import type { LazyObservabilityPageTemplateProps } from '../components/shared/page_template/lazy_page_template';
import type { ObservabilityPublicPluginsStart } from '../plugin';
import type { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';

export interface PluginContextValue {
  appMountParameters: AppMountParameters;
  config: ConfigSchema;
  core: CoreStart;
  plugins: ObservabilityPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
}

export const PluginContext = createContext({} as PluginContextValue);
