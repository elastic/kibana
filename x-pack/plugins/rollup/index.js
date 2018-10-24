/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common';
import { registerLicenseChecker } from './server/lib/register_license_checker';
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
      styleSheetPaths: `${__dirname}/public/index.scss`,
      managementSections: [
        'plugins/rollup/crud_app',
      ],
      // NOTE: These extension points are temporarily disabled until we've resolved issues
      // with auto-scaling the interval for date histogram visualizations.
      // See https://github.com/elastic/kibana/pull/24428 for more info.
      //
      // indexManagement: [
      //   'plugins/rollup/index_pattern_creation',
      //   'plugins/rollup/index_pattern_list',
      // ],
      // visualize: [
      //   'plugins/rollup/visualize',
      // ],
      // search: [
      //   'plugins/rollup/search',
      // ],
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
    }
  });
}
