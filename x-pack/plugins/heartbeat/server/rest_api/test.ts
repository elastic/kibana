/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

export const test = () => ({
  method: 'GET',
  path: '/api/heartbeat',
  config: {
    validate: {
      headers: Joi.object({
        'test-header': Joi.string(),
      }),
    },
  },
  handler: async (request: any, reply: any) => {
    reply({
      test: 'works',
    });
  },
});
