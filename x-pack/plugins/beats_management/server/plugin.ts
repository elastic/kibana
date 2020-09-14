/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { SecurityPluginSetup } from '../../security/server';
import { LicensingPluginStart } from '../../licensing/server';
import { BeatsManagementConfigType } from '../common';
import { CMServerLibs } from './lib/types';
import { registerRoutes } from './routes';
import { compose } from './lib/compose/kibana';
import { INDEX_NAMES } from '../common/constants';
import { beatsIndexTemplate } from './index_templates';

interface SetupDeps {
  security?: SecurityPluginSetup;
}

interface StartDeps {
  licensing: LicensingPluginStart;
}

declare module 'src/core/server' {
  interface RequestHandlerContext {
    beatsManagement?: CMServerLibs;
  }
}

export class BeatsManagementPlugin implements Plugin<{}, {}, SetupDeps, StartDeps> {
  private securitySetup?: SecurityPluginSetup;
  private beatsLibs?: CMServerLibs;

  constructor(
    private readonly initializerContext: PluginInitializerContext<BeatsManagementConfigType>
  ) {}

  public async setup(core: CoreSetup<StartDeps>, { security }: SetupDeps) {
    this.securitySetup = security;

    const router = core.http.createRouter();
    registerRoutes(router);

    core.http.registerRouteHandlerContext('beatsManagement', (_, req) => {
      return this.beatsLibs!;
    });

    return {};
  }

  public async start({ elasticsearch }: CoreStart, { licensing }: StartDeps) {
    const config = await this.initializerContext.config.create().pipe(take(1)).toPromise();
    const logger = this.initializerContext.logger.get();
    const kibanaVersion = this.initializerContext.env.packageInfo.version;

    this.beatsLibs = compose({
      elasticsearch,
      licensing,
      security: this.securitySetup,
      config,
      logger,
      kibanaVersion,
    });

    await this.beatsLibs.database.putTemplate(INDEX_NAMES.BEATS, beatsIndexTemplate);

    return {};
  }
}
