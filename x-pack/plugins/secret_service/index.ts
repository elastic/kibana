/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { join, resolve } from 'path';
// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';
import mappings from './mappings.json';
import { SecretService } from './server';

export const secretService = (kibana: any) => {
  return new kibana.Plugin({
    id: 'SecretService',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.secret_service',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      mappings,
      savedObjectSchemas: {
        secret: {
          hidden: true,
        },
      },
    },

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        secret: Joi.string().default(undefined),
        audit: Joi.object({
          enabled: Joi.boolean().default(false),
        }),
      }).default();
    },

    init(server: any) {
      const warn = (message: string | any) => server.log(['secret-service', 'warning'], message);

      const configKey = 'xpack.secret_service.secret';
      const filePath = join(server.config().get('path.data'), 'kibana.keystore');
      const keystore: any = new server.Keystore(filePath);

      if (!keystore.has(configKey)) {
        keystore.add(configKey, crypto.randomBytes(128).toString('hex'));
        if (!keystore.exists()) {
          warn(`Keystore missing, new keystore created ${keystore.path}`);
        }
        warn('Missing key - one has been auto-generated for use.');
        keystore.save();
      }

      const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
      const repository = server.savedObjects.getSavedObjectsRepository(callWithInternalUser, [
        'secret',
      ]);

      const auditEnabled = server.config().get('xpack.secret_service.audit.enabled');
      let auditor;
      if (auditEnabled) {
        auditor = new AuditLogger(server, this.id);
      }
      const encryptionKey = keystore.get(configKey);
      const service = new SecretService(repository, 'secret', encryptionKey, auditor);

      // validate key used
      if (!service.validate()) {
        warn(
          'Could not validate encryption key, please make sure that the right key in the keystore!'
        );
        throw new SecretServiceKeyError('Could not validate encryption key!');
      }

      server.expose('secretService', service);
    },
  });
};
