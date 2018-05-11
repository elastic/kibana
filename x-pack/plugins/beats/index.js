/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { installIndexTemplate } from './server/lib/index_template';
import { registerApiRoutes } from './server/routes/api';
import { PLUGIN } from './common/constants';

export function beats(kibana)  {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    init: async function (server) {
      await installIndexTemplate(server);
      registerApiRoutes(server);
    }
  });
}
