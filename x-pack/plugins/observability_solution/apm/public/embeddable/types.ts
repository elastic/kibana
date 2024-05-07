/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import type { CoreStart, CoreSetup } from '@kbn/core/public';
import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import type { ApmPluginStartDeps, ApmPluginSetupDeps } from '../plugin';
import type { ConfigSchema } from '..';
import type { KibanaEnvContext } from '../context/kibana_environment_context/kibana_environment_context';
export interface EmbeddableDeps {
  coreStart: CoreStart;
  pluginsStart: ApmPluginStartDeps;
  coreSetup: CoreSetup;
  pluginsSetup: ApmPluginSetupDeps;
  config: ConfigSchema;
  kibanaEnvironment: KibanaEnvContext;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}
export interface APMEmbeddableProps {
  transactionName?: string;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
}

export type APMEmbeddableInput = EmbeddableInput & APMEmbeddableProps;
