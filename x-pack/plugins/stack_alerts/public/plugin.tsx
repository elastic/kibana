/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { registerAlertTypes } from './alert_types';

export type Setup = void;
export type Start = void;

export interface StackAlertsPublicSetupDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  alerting: AlertingSetup;
}

export class StackAlertsPublicPlugin implements Plugin<Setup, Start, StackAlertsPublicSetupDeps> {
  constructor() {}

  public setup(core: CoreSetup, { triggersActionsUi, alerting }: StackAlertsPublicSetupDeps) {
    registerAlertTypes({
      ruleTypeRegistry: triggersActionsUi.ruleTypeRegistry,
      alerting,
    });
  }

  public start() {}
  public stop() {}
}
