/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { registerAndroidRoutes } from './platforms/android/routes';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ClientAppsPlugin extends Service {
  static readonly inject = ['core.http'];
  static readonly provide = 'clientApps';

  constructor(ctx: Context, _config: never) {
    super(ctx, 'clientApps');
    const router = (ctx.get('core.http') as any).createRouter();
    const params = { router, logger: (ctx.get('core.logger') as any).get('plugins', 'clientApps') };

    registerAndroidRoutes(params);

    (ctx.get('core.logger') as any).get('plugins', 'clientApps').info('Client Apps plugin routes registered');
  }
}
