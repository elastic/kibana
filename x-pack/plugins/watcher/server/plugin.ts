/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'kibana/server';

import { PLUGIN, INDEX_NAMES } from '../common/constants';

import type { Dependencies, LicenseStatus, RouteDependencies } from './types';

import { registerSettingsRoutes } from './routes/api/settings';
import { registerIndicesRoutes } from './routes/api/indices';
import { registerLicenseRoutes } from './routes/api/license';
import { registerWatchesRoutes } from './routes/api/watches';
import { registerWatchRoutes } from './routes/api/watch';
import { registerListFieldsRoute } from './routes/api/register_list_fields_route';
import { registerLoadHistoryRoute } from './routes/api/register_load_history_route';

import { handleEsError } from './shared_imports';

export class WatcherServerPlugin implements Plugin<void, void, any, any> {
  private readonly log: Logger;

  private licenseStatus: LicenseStatus = {
    hasRequired: false,
  };

  constructor(ctx: PluginInitializerContext) {
    this.log = ctx.logger.get();
  }

  setup({ http }: CoreSetup, { licensing, features }: Dependencies) {
    const router = http.createRouter();
    const routeDependencies: RouteDependencies = {
      router,
      getLicenseStatus: () => this.licenseStatus,
      lib: {
        handleEsError,
      },
    };

    features.registerElasticsearchFeature({
      id: 'watcher',
      management: {
        insightsAndAlerting: ['watcher'],
      },
      catalogue: ['watcher'],
      privileges: [
        {
          requiredClusterPrivileges: ['manage_watcher'],
          requiredIndexPrivileges: {
            [INDEX_NAMES.WATCHES]: ['read'],
            [INDEX_NAMES.WATCHER_HISTORY]: ['read'],
          },
          ui: [],
        },
        {
          requiredClusterPrivileges: ['monitor_watcher'],
          requiredIndexPrivileges: {
            [INDEX_NAMES.WATCHES]: ['read'],
            [INDEX_NAMES.WATCHER_HISTORY]: ['read'],
          },
          ui: [],
        },
      ],
    });

    registerListFieldsRoute(routeDependencies);
    registerLoadHistoryRoute(routeDependencies);
    registerIndicesRoutes(routeDependencies);
    registerLicenseRoutes(routeDependencies);
    registerSettingsRoutes(routeDependencies);
    registerWatchesRoutes(routeDependencies);
    registerWatchRoutes(routeDependencies);

    licensing.license$.subscribe(async (license) => {
      const { state, message } = license.check(PLUGIN.ID, PLUGIN.MINIMUM_LICENSE_REQUIRED);
      const hasMinimumLicense = state === 'valid';
      if (hasMinimumLicense && license.getFeature(PLUGIN.ID)) {
        this.log.info('Enabling Watcher plugin.');
        this.licenseStatus = {
          hasRequired: true,
        };
      } else {
        if (message) {
          this.log.info(message);
        }
        this.licenseStatus = {
          hasRequired: false,
          message,
        };
      }
    });
  }

  start() {}

  stop() {}
}
