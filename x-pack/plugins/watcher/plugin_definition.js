/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { registerFieldsRoutes } from './server/routes/api/fields';
import { registerSettingsRoutes } from './server/routes/api/settings';
import { registerHistoryRoutes } from './server/routes/api/history';
import { registerIndicesRoutes } from './server/routes/api/indices';
import { registerLicenseRoutes } from './server/routes/api/license';
import { registerWatchesRoutes } from './server/routes/api/watches';
import { registerWatchRoutes } from './server/routes/api/watch';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { PLUGIN } from './common/constants';

export const pluginDefinition = {
  id: PLUGIN.ID,
  configPrefix: 'xpack.watcher',
  publicDir: resolve(__dirname, 'public'),
  require: ['kibana', 'elasticsearch', 'xpack_main'],
  uiExports: {
    managementSections: [
      'plugins/watcher/sections/testbed',
      'plugins/watcher/sections/watch_detail',
      'plugins/watcher/sections/watch_edit',
      'plugins/watcher/sections/watch_list',
      'plugins/watcher/sections/watch_history_item',
    ],
    home: ['plugins/watcher/register_feature']
  },
  init: function (server) {
    registerLicenseChecker(server);

    registerFieldsRoutes(server);
    registerHistoryRoutes(server);
    registerIndicesRoutes(server);
    registerLicenseRoutes(server);
    registerSettingsRoutes(server);
    registerWatchesRoutes(server);
    registerWatchRoutes(server);
  }
};
