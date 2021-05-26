/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup } from 'src/core/server';
import { RuleDataPluginService } from './rule_data_plugin_service';
import { RuleRegistryPluginConfig } from '.';

export type RuleRegistryPluginSetupContract = RuleDataPluginService;
export type RuleRegistryPluginStartContract = void;

export class RuleRegistryPlugin implements Plugin<RuleRegistryPluginSetupContract> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(core: CoreSetup): RuleRegistryPluginSetupContract {
    const config = this.initContext.config.get<RuleRegistryPluginConfig>();

    const logger = this.initContext.logger.get();

    const service = new RuleDataPluginService({
      logger,
      isWriteEnabled: config.write.enabled,
      index: config.index,
      getClusterClient: async () => {
        const [coreStart] = await core.getStartServices();

        return coreStart.elasticsearch.client.asInternalUser;
      },
    });

    service.init().catch((originalError) => {
      const error = new Error('Failed installing assets');
      // @ts-ignore
      error.stack = originalError.stack;
      logger.error(error);
    });

    return service;
  }

  public start(): RuleRegistryPluginStartContract {}

  public stop() {}
}
