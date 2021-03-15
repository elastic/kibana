/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup } from 'src/core/server';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../alerting/server';
import { RuleRegistry } from './rule_registry';
import { defaultIlmPolicy } from './rule_registry/defaults/ilm_policy';
import { defaultFieldMap } from './rule_registry/defaults/field_map';

export type RuleRegistryPluginSetupContract = RuleRegistry<typeof defaultFieldMap>;

export class RuleRegistryPlugin implements Plugin<RuleRegistryPluginSetupContract> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(
    core: CoreSetup,
    plugins: { alerting: AlertingPluginSetupContract }
  ): RuleRegistryPluginSetupContract {
    const globalConfig = this.initContext.config.legacy.get();

    const logger = this.initContext.logger.get();

    const rootRegistry = new RuleRegistry({
      core,
      ilmPolicy: defaultIlmPolicy,
      fieldMap: defaultFieldMap,
      kibanaIndex: globalConfig.kibana.index,
      namespace: 'alert-history',
      kibanaVersion: this.initContext.env.packageInfo.version,
      logger: logger.get('root'),
      alertingPluginSetupContract: plugins.alerting,
    });

    return rootRegistry;
  }

  public start() {}

  public stop() {}
}
