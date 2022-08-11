/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';

import { ApiRoutes } from './routes';
import { handleEsError } from './shared_imports';
import { SetupDependencies, StartDependencies } from './types';

export class LicenseManagementServerPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  private readonly apiRoutes = new ApiRoutes();

  setup(
    { http, getStartServices }: CoreSetup<StartDependencies>,
    { features, security }: SetupDependencies
  ) {
    const router = http.createRouter();

    features.registerElasticsearchFeature({
      id: 'license_management',
      management: {
        stack: ['license_management'],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['manage'],
          ui: [],
        },
      ],
    });

    getStartServices().then(([, { licensing }]) => {
      this.apiRoutes.setup({
        router,
        plugins: {
          licensing,
        },
        lib: {
          handleEsError,
        },
        config: {
          isSecurityEnabled: security !== undefined,
        },
      });
    });
  }

  start() {}
  stop() {}
}
