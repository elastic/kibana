/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { installIndexTemplate } from './server/lib/index_template';
import { registerApiRoutes } from './server/routes/api';
import { PLUGIN } from './common/constants';

const DEFAULT_ENROLLMENT_TOKENS_TTL_S = 10 * 60; // 10 minutes

export function beats(kibana)  {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.beats',
    config: Joi => Joi.object({
      enabled: Joi.boolean().default(true),
      enrollmentTokensTtlInSeconds: Joi.number().integer().min(1).default(DEFAULT_ENROLLMENT_TOKENS_TTL_S)
    }).default(),
    init: async function (server) {
      await installIndexTemplate(server);
      registerApiRoutes(server);
    }
  });
}
