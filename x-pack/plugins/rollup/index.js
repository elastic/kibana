/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { registerIndicesRoute, registerFieldsForWildcardRoute } from './server/routes/api';

export function rollup(kibana)  {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      indexManagement: [
        'plugins/rollup/index_pattern_creation',
        'plugins/rollup/index_pattern_list',
      ],
    },
    init: function (server) {
      registerLicenseChecker(server);
      registerIndicesRoute(server);
      registerFieldsForWildcardRoute(server);
    }
  });
}
