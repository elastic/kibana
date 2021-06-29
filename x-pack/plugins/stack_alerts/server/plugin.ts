/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, Logger, CoreSetup, PluginInitializerContext } from 'src/core/server';

import { StackAlertsDeps, StackAlertsStartDeps } from './types';
import { registerBuiltInAlertTypes } from './alert_types';
import { BUILT_IN_ALERTS_FEATURE } from './feature';

export class AlertingBuiltinsPlugin
  implements Plugin<void, void, StackAlertsDeps, StackAlertsStartDeps> {
  private readonly logger: Logger;

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
  }

  public setup(core: CoreSetup<StackAlertsStartDeps>, { alerting, features }: StackAlertsDeps) {
    features.registerKibanaFeature(BUILT_IN_ALERTS_FEATURE);

    registerBuiltInAlertTypes({
      logger: this.logger,
      data: core
        .getStartServices()
        .then(async ([, { triggersActionsUi }]) => triggersActionsUi.data),
      alerting,
    });
  }

  public start() {}
  public stop() {}
}
