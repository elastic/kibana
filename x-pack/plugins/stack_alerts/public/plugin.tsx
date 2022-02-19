/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../plugins/triggers_actions_ui/public';
import { registerAlertTypes } from './alert_types';
import { Config } from '../common';
import { PluginSetupContract as AlertingSetup } from '../../alerting/public';

export type Setup = void;
export type Start = void;

export interface StackAlertsPublicSetupDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  alerting: AlertingSetup;
}

export class StackAlertsPublicPlugin implements Plugin<Setup, Start, StackAlertsPublicSetupDeps> {
  private initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { triggersActionsUi, alerting }: StackAlertsPublicSetupDeps) {
    registerAlertTypes({
      ruleTypeRegistry: triggersActionsUi.ruleTypeRegistry,
      config: this.initializerContext.config.get<Config>(),
      alerting,
    });
  }

  public start() {}
  public stop() {}
}
