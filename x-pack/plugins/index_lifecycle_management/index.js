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
import { registerIndicesRoutes } from './server/routes/api/indices';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { PLUGIN } from './common/constants';

export function indexLifecycleManagement(kibana)  {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      managementSections: [
        'plugins/index_lifecycle_management',
      ]
    },
    init: function (server) {
      registerLicenseChecker(server);
      registerTemplatesRoutes(server);
      registerNodesRoutes(server);
      registerPoliciesRoutes(server);
      registerLifecycleRoutes(server);
      registerIndicesRoutes(server);
    }
  });
}
