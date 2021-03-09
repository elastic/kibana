/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext, Logger } from 'src/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { SecurityPluginSetup } from '../../security/server';
import { LicensingPluginStart } from '../../licensing/server';
import { BeatsManagementConfigType } from '../common';
import type { BeatsManagementRequestHandlerContext, CMServerLibs } from './lib/types';
import { registerRoutes } from './routes';
import { compose } from './lib/compose/kibana';
import { INDEX_NAMES } from '../common/constants';
import { beatsIndexTemplate } from './index_templates';

interface SetupDeps {
  security?: SecurityPluginSetup;
  features: FeaturesPluginSetup;
}

interface StartDeps {
  licensing: LicensingPluginStart;
}

export class BeatsManagementPlugin implements Plugin<{}, {}, SetupDeps, StartDeps> {
  private readonly logger: Logger;
  private securitySetup?: SecurityPluginSetup;
  private beatsLibs?: CMServerLibs;

  constructor(
    private readonly initializerContext: PluginInitializerContext<BeatsManagementConfigType>
  ) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<StartDeps>, { features, security }: SetupDeps) {
    this.securitySetup = security;

    const router = core.http.createRouter<BeatsManagementRequestHandlerContext>();
    registerRoutes(router);

    core.http.registerRouteHandlerContext<BeatsManagementRequestHandlerContext, 'beatsManagement'>(
      'beatsManagement',
      (_, req) => {
        return this.beatsLibs!;
      }
    );

    features.registerElasticsearchFeature({
      id: 'beats_management',
      management: {
        ingest: ['beats_management'],
      },
      privileges: [
        {
          ui: [],
          requiredClusterPrivileges: [],
          requiredRoles: ['beats_admin'],
        },
      ],
    });

    return {};
  }

  public start({ elasticsearch }: CoreStart, { licensing }: StartDeps) {
    const config = this.initializerContext.config.get();
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

    this.beatsLibs.database.putTemplate(INDEX_NAMES.BEATS, beatsIndexTemplate).catch((e) => {
      this.logger.error(`Error create beats template: ${e.message}`);
    });

    return {};
  }
}
