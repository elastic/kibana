/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import {
  IContainer,
  ErrorEmbeddable,
  EmbeddableInput,
} from '@kbn/embeddable-plugin/public';
import { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import type {
  ApmPluginStartDeps,
  ApmPluginStart,
  ApmPluginSetupDeps,
} from '../plugin';
import type { ConfigSchema } from '..';
import type { APMEmbeddable } from './types';
import type { KibanaEnvContext } from '../context/kibana_environment_context/kibana_environment_context';

export class APMEmbeddableFactoryDefinition {
  constructor(
    private coreSetup: CoreSetup<ApmPluginStartDeps, ApmPluginStart>,
    private pluginsSetup: ApmPluginSetupDeps,
    private config: ConfigSchema,
    private kibanaEnvironment: KibanaEnvContext,
    private observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
  ) {}

  public async createInstance(
    Embeddable: new (...args: any[]) => APMEmbeddable,
    initialInput: EmbeddableInput,
    parent?: IContainer
  ) {
    try {
      const [coreStart, pluginsStart] = await this.coreSetup.getStartServices();
      return new Embeddable(
        {
          coreStart,
          pluginsStart,
          pluginsSetup: this.pluginsSetup,
          coreSetup: this.coreSetup,
          config: this.config,
          kibanaEnvironment: this.kibanaEnvironment,
          observabilityRuleTypeRegistry: this.observabilityRuleTypeRegistry,
        },
        initialInput,
        parent
      );
    } catch (e) {
      return new ErrorEmbeddable(e, initialInput, parent);
    }
  }
}
