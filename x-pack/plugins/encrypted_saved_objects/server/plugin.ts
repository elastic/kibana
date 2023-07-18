/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nodeCrypto from '@elastic/node-crypto';
import { createHash } from 'crypto';

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';

import type { ConfigType } from './config';
import type { CreateEncryptedSavedObjectsMigrationFn } from './create_migration';
import { getCreateMigration } from './create_migration';
import type { EncryptedSavedObjectTypeRegistration } from './crypto';
import {
  EncryptedSavedObjectsService,
  EncryptionError,
  EncryptionKeyRotationService,
} from './crypto';
import { defineRoutes } from './routes';
import type { ClientInstanciator } from './saved_objects';
import { setupSavedObjects } from './saved_objects';

export interface PluginsSetup {
  security?: SecurityPluginSetup;
}

export interface EncryptedSavedObjectsPluginSetup {
  /**
   * Indicates if Saved Object encryption is possible. Requires an encryption key to be explicitly set via `xpack.encryptedSavedObjects.encryptionKey`.
   */
  canEncrypt: boolean;
  registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) => void;
  createMigration: CreateEncryptedSavedObjectsMigrationFn;
}

export interface EncryptedSavedObjectsPluginStart {
  isEncryptionError: (error: Error) => boolean;
  getClient: ClientInstanciator;
}

/**
 * Represents EncryptedSavedObjects Plugin instance that will be managed by the Kibana plugin system.
 */
export class EncryptedSavedObjectsPlugin
  implements
    Plugin<EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart, PluginsSetup>
{
  private readonly logger: Logger;
  private savedObjectsSetup!: ClientInstanciator;
  private esoService!: EncryptedSavedObjectsService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup, deps: PluginsSetup): EncryptedSavedObjectsPluginSetup {
    const config = this.initializerContext.config.get<ConfigType>();
    const canEncrypt = config.encryptionKey !== undefined;
    if (!canEncrypt) {
      this.logger.warn(
        'Saved objects encryption key is not set. This will severely limit Kibana functionality. ' +
          'Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    } else {
      const hashedEncryptionKey = createHash('sha3-256')
        .update(config.encryptionKey)
        .digest('base64');

      this.logger.info(
        `Hashed 'xpack.encryptedSavedObjects.encryptionKey' for this instance: ${hashedEncryptionKey}`
      );
    }

    const primaryCrypto = config.encryptionKey
      ? nodeCrypto({ encryptionKey: config.encryptionKey })
      : undefined;
    const decryptionOnlyCryptos = config.keyRotation.decryptionOnlyKeys.map((decryptionKey) =>
      nodeCrypto({ encryptionKey: decryptionKey })
    );

    // Embedding excluded AAD fields POC rev2
    // Could no longer freeze - what is the risk?
    this.esoService = new EncryptedSavedObjectsService({
      primaryCrypto,
      decryptionOnlyCryptos,
      logger: this.logger,
    });

    this.savedObjectsSetup = setupSavedObjects({
      service: this.esoService,
      savedObjects: core.savedObjects,
      security: deps.security,
      getStartServices: core.getStartServices,
    });

    defineRoutes({
      router: core.http.createRouter(),
      logger: this.initializerContext.logger.get('routes'),
      encryptionKeyRotationService: Object.freeze(
        new EncryptionKeyRotationService({
          logger: this.logger.get('key-rotation-service'),
          service: this.esoService,
          getStartServices: core.getStartServices,
          security: deps.security,
        })
      ),
      config,
    });

    return {
      canEncrypt,
      registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) =>
        this.esoService.registerType(typeRegistration),
      createMigration: getCreateMigration(
        this.esoService,
        (typeRegistration: EncryptedSavedObjectTypeRegistration) => {
          const serviceForMigration = new EncryptedSavedObjectsService({
            primaryCrypto,
            decryptionOnlyCryptos,
            logger: this.logger,
          });
          serviceForMigration.registerType(typeRegistration);
          return serviceForMigration;
        }
      ),
    };
  }

  public start({ savedObjects }: CoreStart) {
    this.logger.debug('Starting plugin');
    this.esoService.initializeVersionedMetadata(savedObjects);
    return {
      isEncryptionError: (error: Error) => error instanceof EncryptionError,
      getClient: (options = {}) => this.savedObjectsSetup(options),
    };
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
