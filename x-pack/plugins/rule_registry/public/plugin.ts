/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin as PluginClass,
  PluginInitializerContext,
} from '../../../../src/core/public';
import {
  PluginSetupContract as AlertingPluginPublicSetupContract,
  PluginStartContract as AlertingPluginPublicStartContract,
} from '../../alerting/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../triggers_actions_ui/public';
import { baseRuleFieldMap } from '../common';
import { RuleRegistry } from './rule_registry';

interface RuleRegistrySetupPlugins {
  alerting: AlertingPluginPublicSetupContract;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

interface RuleRegistryStartPlugins {
  alerting: AlertingPluginPublicStartContract;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export type RuleRegistryPublicPluginSetupContract = ReturnType<Plugin['setup']>;

export class Plugin
  implements PluginClass<void, void, RuleRegistrySetupPlugins, RuleRegistryStartPlugins> {
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup<RuleRegistryStartPlugins>, plugins: RuleRegistrySetupPlugins) {
    const rootRegistry = new RuleRegistry({
      fieldMap: baseRuleFieldMap,
      alertTypeRegistry: plugins.triggersActionsUi.alertTypeRegistry,
    });
    return {
      registry: rootRegistry,
    };
  }

  start(core: CoreStart, plugins: RuleRegistryStartPlugins) {
    return {
      registerType: plugins.triggersActionsUi.alertTypeRegistry,
    };
  }
}
