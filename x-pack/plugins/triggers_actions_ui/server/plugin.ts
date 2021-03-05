/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, Plugin, CoreSetup, PluginInitializerContext } from 'src/core/server';
import { PluginSetupContract as AlertsPluginSetup } from '../../alerting/server';
import { EncryptedSavedObjectsPluginSetup } from '../../encrypted_saved_objects/server';
import { getService, register as registerDataService } from './data';
import { createHealthRoute } from './routes/health';

const BASE_ROUTE = '/api/triggers_actions_ui';
export interface PluginStartContract {
  data: ReturnType<typeof getService>;
}

interface PluginsSetup {
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  alerting?: AlertsPluginSetup;
}

export class TriggersActionsPlugin implements Plugin<void, PluginStartContract> {
  private readonly logger: Logger;
  private readonly data: PluginStartContract['data'];

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
    this.data = getService();
  }

  public setup(core: CoreSetup, plugins: PluginsSetup): void {
    const router = core.http.createRouter();
    registerDataService({
      logger: this.logger,
      data: this.data,
      router,
      baseRoute: BASE_ROUTE,
    });

    createHealthRoute(this.logger, router, BASE_ROUTE, plugins.alerting !== undefined);
  }

  public start(): PluginStartContract {
    return {
      data: this.data,
    };
  }

  public async stop(): Promise<void> {}
}
