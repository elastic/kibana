/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { join, resolve } from 'path';
import { Keystore } from '../../../src/server/keystore';
import { getData } from '../../../src/server/path';
import mappings from './mappings.json';
import { SecretStore } from './server';

const path = join(getData(), 'kibana.keystore');
const keystore = new Keystore(path);

export const secretstore = (kibana: any) => {
  return new kibana.Plugin({
    id: 'secretstore',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      mappings,
      savedObjectSchemas: {
        secretType: {
          hidden: true,
        },
      },
    },

    init(server: any) {
      const warn = (message: string | any) => server.log(['secretstore', 'warning'], message);

      if (!keystore.exists()) {
        keystore.reset();
        keystore.save();
        warn(`Keystore missing, new keystore created ${keystore.path}`);
      }

      if (!keystore.has('xpack.secretstore.secret')) {
        keystore.add('xpack.secretstore.secret', crypto.randomBytes(128).toString('hex'));
        warn('Missing key - one has been auto-generated for use.');
      }

      server.expose(
        'secretstore',
        new SecretStore(
          server.savedObjects.getScopedSavedObjectsClient(),
          'secretType',
          keystore.get('xpack.secretstore.secret')
        )
      );
    },
  });
};
