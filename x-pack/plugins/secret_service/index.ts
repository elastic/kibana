/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { Root } from 'joi';
import { Legacy } from 'kibana';
import { SavedObject } from 'src/legacy/server/saved_objects';
import mappings from './mappings.json';
import {
  CONFIG_KEY_NAME,
  SavedObjectAttributeCryptoClientWrapperFactoryProvider,
  SecretService,
} from './server';

export const secretService = (kibana: any) => {
  return new kibana.Plugin({
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

    async init(server: Legacy.Server) {
      const warn = (message: string | any) => server.log(['secret-service', 'warning'], message);
      const info = (message: string | any) => server.log(['secret-service', 'info'], message);

      let encryptionKey = server.config().get<string>(CONFIG_KEY_NAME);

      if (!encryptionKey) {
        encryptionKey = crypto.randomBytes(128).toString('hex');
        warn('Encryption key is missing - one has been auto-generated for use!');
      }

      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
      const repository = server.savedObjects.getSavedObjectsRepository(callWithInternalUser, [
        'secret',
      ]);

      const service = new SecretService(repository, 'secret', encryptionKey);

      // server.savedObjects.addScopedSavedObjectsClientWrapperFactory(
      //   0,
      //   SavedObjectAttributeCryptoClientWrapperFactoryProvider(info)
      // );

      server.expose('secretService', service);
      server.expose('savedObjectAttributeCrypto', {
        registerType: <T extends SavedObject>({ type, attributes }: T) => {
          warn(`A plugin adds  ${type} ${JSON.stringify(attributes)} as encrypted attributes`);
        },
        // get: <T extends SavedObject>(id: string, type: string): Promise<T> => {
        //   // ensure type is valid
        //   return Promise.resolve({
        //     id,
        //     type,
        //     attributes: {},
        //     references: [],
        //   });
        // },
      });
    },
  });
};
