/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup } from 'src/core/server';
import { once } from 'lodash';
import { RuleDataPluginService } from './rule_data_plugin_service';
import { RuleRegistryPluginConfig } from '.';
import { technicalComponentTemplate } from './assets/component_templates/technical_component_template';
import {
  DEFAULT_ILM_POLICY_ID,
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../common/assets';
import { ecsComponentTemplate } from './assets/component_templates/ecs_component_template';
import { defaultLifecyclePolicy } from './assets/lifecycle_policies/default_lifecycle_policy';

export type RuleRegistryPluginSetupContract = RuleDataPluginService;
export type RuleRegistryPluginStartContract = void;

export class RuleRegistryPlugin implements Plugin<RuleRegistryPluginSetupContract> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(core: CoreSetup): RuleRegistryPluginSetupContract {
    const globalConfig = this.initContext.config.legacy.get();
    const config = this.initContext.config.get<RuleRegistryPluginConfig>();

    const logger = this.initContext.logger.get();

    const ready = once(async () => {
      logger.debug('Installing assets');

      const startServicesPromise = core.getStartServices();

      await service.createOrUpdateLifecyclePolicy({
        policy_id: service.getFullAssetName(DEFAULT_ILM_POLICY_ID),
        body: defaultLifecyclePolicy,
      });

      await service.createOrUpdateComponentTemplate({
        name: service.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
        body: technicalComponentTemplate,
      });

      await service.createOrUpdateComponentTemplate({
        name: service.getFullAssetName(ECS_COMPONENT_TEMPLATE_NAME),
        body: ecsComponentTemplate,
      });

      const [coreStart] = await startServicesPromise;

      return {
        clusterClient: coreStart.elasticsearch.client.asInternalUser,
      };
    });

    ready().catch((originalError) => {
      const error = new Error('Failed installing assets');
      Object.assign(error, { originalError });
      logger.error(error);
    });

    const service = new RuleDataPluginService({
      logger,
      isWriteEnabled: config.unsafe.write.enabled,
      kibanaIndex: globalConfig.kibana.index,
      ready,
    });

    return service;
  }

  public start(): RuleRegistryPluginStartContract {}

  public stop() {}
}
