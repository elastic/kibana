/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { Root } from 'joi';
import { resolve } from 'path';
import mappings from './mappings.json';
import { CONFIG_KEY_NAME, SecretService } from './server';

export const secretService = (kibana: any) => {
  return new kibana.Plugin({
    id: 'SecretService',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.secret_service',
    uiExports: {
      mappings,
      savedObjectSchemas: {
        secret: {
          hidden: true,
        },
      },
    },

    config(Joi: Root) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        secret: Joi.string().default(undefined),
        audit: Joi.object({
          enabled: Joi.boolean().default(false),
        }),
      }).default();
    },

    async init(server: any) {
      const warn = (message: string | any) => server.log(['secret-service', 'warning'], message);

      let encryptionKey = server.config().get(CONFIG_KEY_NAME);

      if (!encryptionKey) {
        encryptionKey = crypto.randomBytes(128).toString('hex');
        warn('Encryption key is missing - one has been auto-generated for use!');
      }

      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
      const repository = server.savedObjects.getSavedObjectsRepository(callWithInternalUser, [
        'secret',
      ]);

      const service = new SecretService(repository, 'secret', encryptionKey);

      // validate key used
      const valid = await service.validateKey();

      if (!valid) {
        throw new Error(
          `Config key '${CONFIG_KEY_NAME}' is not valid, please ensure your kibana keystore is setup properly!`
        );
      }
      server.expose('secretService', service);
    },
  });
};
