/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { registerLicenseRoute, registerStartTrialRoutes, registerStartBasicRoute } from './server/routes/api/license/';
import { createRouter } from '../../server/lib/create_router';
import { registerLicenseChecker } from '../../server/lib/register_license_checker';

export function licenseManagement(kibana)  {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.license_management',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: [
        'plugins/license_management',
      ]
    },
    init: (server) => {
      const xpackInfo = server.plugins.xpack_main.info;
      const router = createRouter(server, PLUGIN.ID, '/api/license');
      registerLicenseChecker(server, PLUGIN.ID, PLUGIN.NAME, PLUGIN.MINIMUM_LICENSE_REQUIRED);
      registerLicenseRoute(router, xpackInfo);
      registerStartTrialRoutes(router, xpackInfo);
      registerStartBasicRoute(router, xpackInfo);
    }
  });
}
