/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { rollupDataEnricher } from './rollup_data_enricher';
import {
  registerIndicesRoute,
  registerFieldsForWildcardRoute,
  registerSearchRoute,
  registerJobsRoute,
} from './server/routes/api';
import { registerRollupUsageCollector } from './server/usage';

export function rollup(kibana) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: [
        'plugins/rollup/crud_app',
      ],
      indexManagement: [
        'plugins/rollup/index_pattern_creation',
        'plugins/rollup/index_pattern_list',
        'plugins/rollup/extend_index_management',
      ],
      visualize: [
        'plugins/rollup/visualize',
      ],
      search: [
        'plugins/rollup/search',
      ],
      migrations: {
        'index-pattern': {
          '6.5.0': (doc) => {
            doc.attributes.type = doc.attributes.type || undefined;
            doc.attributes.typeMeta = doc.attributes.typeMeta || undefined;
            return doc;
          }
        },
      }
    },
    init: function (server) {
      registerLicenseChecker(server);
      registerIndicesRoute(server);
      registerFieldsForWildcardRoute(server);
      registerSearchRoute(server);
      registerJobsRoute(server);
      registerRollupUsageCollector(server);
      if (
        server.plugins.index_management &&
        server.plugins.index_management.addIndexManagementDataEnricher
      ) {
        server.plugins.index_management.addIndexManagementDataEnricher(rollupDataEnricher);
      }
    }
  });
}
