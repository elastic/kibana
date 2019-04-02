/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { Request } from 'hapi';
import { Root } from 'joi';
import { Legacy } from 'kibana';

import { EncryptedSavedObjectsClientWrapper } from './server/lib/encrypted_saved_objects_client_wrapper';
import {
  EncryptedSavedObjectsService,
  EncryptedSavedObjectTypeRegistration,
} from './server/lib/encrypted_saved_objects_service';
import { createLogger } from './server/lib/logger';

export const encryptedSavedObjects = (kibana: any) =>
  new kibana.Plugin({
    id: 'encrypted_saved_objects',
    configPrefix: 'xpack.encrypted_saved_objects',
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    config(Joi: Root) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        encryptionKey: Joi.string().min(32),
        audit: Joi.object({ enabled: Joi.boolean().default(false) }),
      }).default();
    },

    async init(server: Legacy.Server) {
      const config = server.config();
      let encryptionKey = config.get<string>('xpack.encrypted_saved_objects.encryptionKey');
      if (encryptionKey == null) {
        server.log(
          ['warning', 'encrypted-saved-objects'],
          'Generating a random key for xpack.encrypted_saved_objects.encryptionKey. To be able ' +
            'to decrypt encrypted saved objects attributes after restart, please set ' +
            'xpack.encrypted_saved_objects.encryptionKey in kibana.yml'
        );

        encryptionKey = crypto.randomBytes(16).toString('hex');
      }

      const service = Object.freeze(
        new EncryptedSavedObjectsService(
          encryptionKey,
          server.savedObjects.types,
          createLogger(server)
        )
      );

      server.expose('registerType', (typeRegistration: EncryptedSavedObjectTypeRegistration) =>
        service.registerType(typeRegistration)
      );

      // This "hidden" option is used to tell `EncryptedSavedObjectsClientWrapper` to not strip
      // encrypted attributes for a particular request (only `get` respects this option).
      const dontStripOption = Symbol('do-not-strip');
      server.expose('getDecrypted', async (request: Request, id: string, type: string) => {
        const savedObject = await request.getSavedObjectsClient().get(type, id, {
          [dontStripOption as symbol]: dontStripOption.description,
        });

        await service.decryptAttributes(type, savedObject.attributes, id);

        return savedObject;
      });

      // Register custom saved object client that will encrypt, decrypt and strip saved object
      // attributes where appropriate for any saved object repository request.
      server.savedObjects.addScopedSavedObjectsClientWrapperFactory(
        Number.MIN_VALUE + 1,
        ({ client: baseClient }) =>
          new EncryptedSavedObjectsClientWrapper({ baseClient, service, dontStripOption })
      );

      // TODO: DO WE REALLY NEED THIS? If someone can change prototype then they likely can read
      //  config object, get the encryption key and hence decrypt everything they want.
      // Object.freeze(EncryptedSavedObjectsService.prototype);
      // Object.freeze(EncryptedSavedObjectsClientWrapper.prototype);
    },
  });
