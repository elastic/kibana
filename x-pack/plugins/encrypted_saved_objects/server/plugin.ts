/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { Legacy, Server } from 'kibana';
import { SavedObjectsRepository } from 'src/legacy/server/saved_objects/service/lib';
import { BaseOptions } from 'src/legacy/server/saved_objects/service/saved_objects_client';
import {
  EncryptedSavedObjectsService,
  EncryptedSavedObjectTypeRegistration,
  EncryptionError,
  EncryptedSavedObjectsAuditLogger,
  EncryptedSavedObjectsClientWrapper,
} from './lib';

export const PLUGIN_ID = 'encrypted_saved_objects';
export const CONFIG_PREFIX = `xpack.${PLUGIN_ID}`;

interface CoreSetup {
  config: { encryptionKey?: string };
  elasticsearch: Legacy.Plugins.elasticsearch.Plugin;
  savedObjects: Legacy.SavedObjectsService;
}

interface PluginsSetup {
  audit: unknown;
}

export class Plugin {
  constructor(private readonly log: Server.Logger) {}

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    let encryptionKey = core.config.encryptionKey;
    if (encryptionKey == null) {
      this.log.warn(
        `Generating a random key for ${CONFIG_PREFIX}.encryptionKey. To be able ` +
          'to decrypt encrypted saved objects attributes after restart, please set ' +
          `${CONFIG_PREFIX}.encryptionKey in kibana.yml`
      );

      encryptionKey = crypto.randomBytes(16).toString('hex');
    }

    const service = Object.freeze(
      new EncryptedSavedObjectsService(
        encryptionKey,
        core.savedObjects.types,
        this.log,
        new EncryptedSavedObjectsAuditLogger(plugins.audit)
      )
    );

    // Register custom saved object client that will encrypt, decrypt and strip saved object
    // attributes where appropriate for any saved object repository request.
    core.savedObjects.addScopedSavedObjectsClientWrapperFactory(
      Number.MIN_VALUE + 1,
      ({ client: baseClient }) => new EncryptedSavedObjectsClientWrapper({ baseClient, service })
    );

    const internalRepository: SavedObjectsRepository = core.savedObjects.getSavedObjectsRepository(
      core.elasticsearch.getCluster('admin').callWithInternalUser
    );

    return {
      isEncryptionError: (error: Error) => error instanceof EncryptionError,
      registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) =>
        service.registerType(typeRegistration),
      getDecryptedAsInternalUser: async (type: string, id: string, options?: BaseOptions) => {
        const savedObject = await internalRepository.get(type, id, options);
        return {
          ...savedObject,
          attributes: await service.decryptAttributes(type, id, savedObject.attributes),
        };
      },
    };
  }
}
