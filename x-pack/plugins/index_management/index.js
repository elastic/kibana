/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { registerIndicesRoutes } from './server/routes/api/indices';
import { registerMappingRoute } from './server/routes/api/mapping';
import { registerSettingsRoutes } from './server/routes/api/settings';
import { registerStatsRoute } from './server/routes/api/stats';
import { registerLicenseChecker } from './server/lib/register_license_checker';

export default function (kibana)  {
  return new kibana.Plugin({
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      managementSections: [
        'plugins/index_management',
      ]
    },
    init: function (server) {
      registerLicenseChecker(server);
      registerIndicesRoutes(server);
      registerSettingsRoutes(server);
      registerStatsRoute(server);
      registerMappingRoute(server);
    }
  });
}
