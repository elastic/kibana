/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, Plugin, CoreSetup, PluginInitializerContext } from 'src/core/server';
import { PluginSetupContract as AlertsPluginSetup } from '../../alerts/server';
import { EncryptedSavedObjectsPluginSetup } from '../../encrypted_saved_objects/server';
import { getService, register as registerDataService } from './data';
import { createHealthRoute } from './routes/health';

const BASE_ROUTE = '/api/triggers_actions_ui';
export interface PluginStartContract {
  data: ReturnType<typeof getService>;
}

interface PluginsSetup {
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  alerts?: AlertsPluginSetup;
}

export class TriggersActionsPlugin implements Plugin<void, PluginStartContract> {
  private readonly logger: Logger;
  private readonly data: PluginStartContract['data'];

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
    this.data = getService();
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup): Promise<void> {
    const router = core.http.createRouter();
    registerDataService({
      logger: this.logger,
      data: this.data,
      router,
      baseRoute: BASE_ROUTE,
    });

    createHealthRoute(this.logger, router, BASE_ROUTE, plugins.alerts !== undefined);
  }

  public async start(): Promise<PluginStartContract> {
    return {
      data: this.data,
    };
  }

  public async stop(): Promise<void> {}
}
