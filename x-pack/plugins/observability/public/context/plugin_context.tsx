/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters } from '@kbn/core/public';
import { createContext } from 'react';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { ConfigSchema } from '..';
import { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';
import type { LazyObservabilityPageTemplateProps } from '../components/shared/page_template/lazy_page_template';

export interface PluginContextValue {
  appMountParameters: AppMountParameters;
  config: ConfigSchema;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  kibanaFeatures: KibanaFeature[];
}

export const PluginContext = createContext({} as PluginContextValue);
