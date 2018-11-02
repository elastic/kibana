/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { registerTemplatesRoutes } from './server/routes/api/templates';
import { registerNodesRoutes } from './server/routes/api/nodes';
import { registerPoliciesRoutes } from './server/routes/api/policies';
import { registerLifecycleRoutes } from './server/routes/api/lifecycle';
import { registerIndexRoutes } from './server/routes/api/index';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { PLUGIN } from './common/constants';
import { indexLifecycleDataEnricher } from './index_lifecycle_data';
export function indexLifecycleManagement(kibana) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main', 'index_management'],
    uiExports: {
      managementSections: ['plugins/index_lifecycle_management'],
    },
    init: function (server) {
      registerLicenseChecker(server);
      registerTemplatesRoutes(server);
      registerNodesRoutes(server);
      registerPoliciesRoutes(server);
      registerLifecycleRoutes(server);
      registerIndexRoutes(server);
      if (
        server.plugins.index_management &&
        server.plugins.index_management.addIndexManagementDataEnricher
      ) {
        server.plugins.index_management.addIndexManagementDataEnricher(indexLifecycleDataEnricher);
      }
    },
  });
}
