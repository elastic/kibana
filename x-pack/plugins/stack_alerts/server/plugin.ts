/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, Logger, CoreSetup, CoreStart, PluginInitializerContext } from 'src/core/server';

import { Service, IService, StackAlertsDeps } from './types';
import { getService as getServiceIndexThreshold } from './alert_types/index_threshold';
import { registerBuiltInAlertTypes } from './alert_types';
import { BUILT_IN_ALERTS_FEATURE } from './feature';

export class AlertingBuiltinsPlugin implements Plugin<IService, IService> {
  private readonly logger: Logger;
  private readonly service: Service;

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
    this.service = {
      indexThreshold: getServiceIndexThreshold(),
      logger: this.logger,
    };
  }

  public async setup(core: CoreSetup, { alerts, features }: StackAlertsDeps): Promise<IService> {
    features.registerKibanaFeature(BUILT_IN_ALERTS_FEATURE);

    registerBuiltInAlertTypes({
      service: this.service,
      router: core.http.createRouter(),
      alerts,
      baseRoute: '/api/stack_alerts',
    });
    return this.service;
  }

  public async start(core: CoreStart): Promise<IService> {
    return this.service;
  }

  public async stop(): Promise<void> {}
}
