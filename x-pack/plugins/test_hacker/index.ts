/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import JoiNamespace from 'joi';
import { Server } from 'hapi';

export const testHacker = (kibana: any) => {
  return new kibana.Plugin({
    id: 'testHacker',
    configPrefix: 'xpack.testHacker',
    publicDir: resolve(__dirname, 'public'),
    require: ['elasticsearch'],

    config(Joi: typeof JoiNamespace) {
      return Joi.object({
        enabled: Joi.boolean().default(true)
      }).default();
    },

    uiExports: {
      hacks: [
        'plugins/test_hacker/hacks/test_hacker_hack',
      ],
    },

    init(server: Server) {
      console.log('inited!')
    }
  });
};
