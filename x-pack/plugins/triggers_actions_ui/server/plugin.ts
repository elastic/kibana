/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, Plugin, CoreSetup, PluginInitializerContext } from 'src/core/server';
import { getService, register as registerDataService } from './data';

export interface PluginStartContract {
  data: ReturnType<typeof getService>;
}

export class TriggersActionsPlugin implements Plugin<void, PluginStartContract> {
  private readonly logger: Logger;
  private readonly data: PluginStartContract['data'];

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
    this.data = getService();
  }

  public async setup(core: CoreSetup): Promise<void> {
    registerDataService({
      logger: this.logger,
      data: this.data,
      router: core.http.createRouter(),
      baseRoute: '/api/triggers_actions_ui',
    });
  }

  public async start(): Promise<PluginStartContract> {
    return {
      data: this.data,
    };
  }

  public async stop(): Promise<void> {}
}
