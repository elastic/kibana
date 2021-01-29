/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

  public async setup(
    core: CoreSetup<StackAlertsStartDeps>,
    { alerts, features }: StackAlertsDeps
  ): Promise<void> {
    features.registerKibanaFeature(BUILT_IN_ALERTS_FEATURE);

    registerBuiltInAlertTypes({
      logger: this.logger,
      data: core
        .getStartServices()
        .then(async ([, { triggersActionsUi }]) => triggersActionsUi.data),
      alerts,
    });
  }

  public async start(): Promise<void> {}
  public async stop(): Promise<void> {}
}
