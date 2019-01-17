/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { join, resolve } from 'path';
import { Keystore } from '../../../src/server/keystore';
import { getData } from '../../../src/server/path';
import { SecretStore } from './server';

const path = join(getData(), 'kibana.keystore');
const keystore = new Keystore(path);

export const secretstore = (kibana: any) => {
  return new kibana.Plugin({
    id: 'secretstore',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.secretstore',
    publicDir: resolve(__dirname, 'public'),

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        secret: Joi.string().default(undefined),
      }).default();
    },

    init(server: any) {
      const warn = (message: string | any) => server.log(['secretstore', 'warning'], message);

      // const secret = server.config().get('xpack.secretstore.secret');
      if (!keystore.exists()) {
        keystore.reset();
        keystore.save();
        warn(`Keystore missing, new keystore created ${keystore.path}`);
      }

      if (!keystore.has('xpack.secretstore.secret')) {
        keystore.add('xpack.secretstore.secret', crypto.randomBytes(128).toString('hex'));
        warn('Missing key - one has been auto-generated for use.');
        keystore.save();
      }

      server.expose('secretstore', new SecretStore(keystore.get('xpack.secretstore.secret')));
    },
  });
};
