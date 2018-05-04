/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerLicenseRoute, registerStartTrialRoutes, registerStartBasicRoute } from "./server/routes/api/license/";

export default function (kibana)  {
  return new kibana.Plugin({
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
