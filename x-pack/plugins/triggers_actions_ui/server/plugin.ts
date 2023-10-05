/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, Plugin, CoreSetup, PluginInitializerContext } from '@kbn/core/server';
import {
  PluginSetupContract as AlertingPluginSetup,
  PluginStartContract as AlertingPluginStart,
} from '@kbn/alerting-plugin/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { getService, register as registerDataService } from './data';
import { createHealthRoute, createConfigRoute } from './routes';
import { BASE_TRIGGERS_ACTIONS_UI_API_PATH } from '../common';

export interface PluginStartContract {
  data: ReturnType<typeof getService>;
}

interface PluginsSetup {
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  alerting: AlertingPluginSetup;
}

interface TriggersActionsPluginStart {
  alerting: AlertingPluginStart;
}

export class TriggersActionsPlugin implements Plugin<void, PluginStartContract> {
  private readonly logger: Logger;
  private readonly data: PluginStartContract['data'];

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
    this.data = getService();
  }

  public setup(core: CoreSetup<TriggersActionsPluginStart>, plugins: PluginsSetup): void {
    const router = core.http.createRouter();
    registerDataService({
      logger: this.logger,
      data: this.data,
      router,
      baseRoute: BASE_TRIGGERS_ACTIONS_UI_API_PATH,
    });

    createHealthRoute(
      this.logger,
      router,
      BASE_TRIGGERS_ACTIONS_UI_API_PATH,
      plugins.alerting !== undefined
    );

    core.getStartServices().then(([_, pluginStart]) => {
      createConfigRoute({
        logger: this.logger,
        router,
        baseRoute: BASE_TRIGGERS_ACTIONS_UI_API_PATH,
        alertingConfig: plugins.alerting.getConfig,
        getRulesClientWithRequest: pluginStart.alerting.getRulesClientWithRequest,
      });
    });
  }

  public start(): PluginStartContract {
    return {
      data: this.data,
    };
  }
}
