/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { registerLicenseRoute, registerStartTrialRoutes, registerStartBasicRoute } from "./server/routes/api/license/";

export function licenseManagement(kibana)  {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      managementSections: [
        'plugins/license_management',
      ]
    },
    init: (server) => {
      registerLicenseRoute(server);
      registerStartTrialRoutes(server);
      registerStartBasicRoute(server);
    }
  });
}
