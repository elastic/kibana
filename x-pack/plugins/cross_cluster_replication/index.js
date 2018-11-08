/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { registerRoutes } from './server/routes/register_routes';

export function crossClusterReplication(kibana) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      styleSheetPaths: `${__dirname}/public/index.scss`,
      managementSections: ['plugins/cross_cluster_replication'],
    },
    init: function initCcrPlugin(server) {
      registerLicenseChecker(server);
      registerRoutes(server);
    },
  });
}
