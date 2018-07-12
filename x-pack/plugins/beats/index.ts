/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { PLUGIN } from './common/constants';
import { initServerWithKibana } from './server/kibana.index';

const DEFAULT_ENROLLMENT_TOKENS_TTL_S = 10 * 60; // 10 minutes

export const config = Joi.object({
  enabled: Joi.boolean().default(true),
  encryptionKey: Joi.string(),
  enrollmentTokensTtlInSeconds: Joi.number()
    .integer()
    .min(1)
    .default(DEFAULT_ENROLLMENT_TOKENS_TTL_S),
}).default();
export const configPrefix = 'xpack.beats';

export function beats(kibana: any) {
  return new kibana.Plugin({
    config: () => config,
    configPrefix,
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    init(server: any) {
      initServerWithKibana(server);
    },
  });
}
