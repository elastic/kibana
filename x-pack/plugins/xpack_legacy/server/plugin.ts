/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';

import {
  CoreStart,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { registerSettingsRoute } from './routes/settings';

interface SetupPluginDeps {
  usageCollection: UsageCollectionSetup;
}

export class XpackLegacyPlugin implements Plugin {
  constructor(private readonly initContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup, { usageCollection }: SetupPluginDeps) {
    const router = core.http.createRouter();
    const globalConfig = await this.initContext.config.legacy.globalConfig$
      .pipe(first())
      .toPromise();
    const serverInfo = core.http.getServerInfo();

    registerSettingsRoute({
      router,
      usageCollection,
      overallStatus$: core.status.overall$,
      config: {
        kibanaIndex: globalConfig.kibana.index,
        kibanaVersion: this.initContext.env.packageInfo.version,
        uuid: this.initContext.env.instanceUuid,
        server: serverInfo,
      },
    });
  }

  public start(core: CoreStart) {}

  public stop() {}
}
