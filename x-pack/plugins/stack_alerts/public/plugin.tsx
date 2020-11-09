/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../plugins/triggers_actions_ui/public';
import { registerAlertTypes } from './alert_types';
import { Config } from '../common';

export type Setup = void;
export type Start = void;

export interface StackAlertsPublicSetupDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

export class StackAlertsPublicPlugin implements Plugin<Setup, Start, StackAlertsPublicSetupDeps> {
  private initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { triggersActionsUi }: StackAlertsPublicSetupDeps) {
    registerAlertTypes({
      alertTypeRegistry: triggersActionsUi.alertTypeRegistry,
      config: this.initializerContext.config.get<Config>(),
    });
  }

  public start() {}
  public stop() {}
}
