/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodeCrypto from '@elastic/node-crypto';
import { Logger, PluginInitializerContext, CoreSetup } from 'src/core/server';
import { first } from 'rxjs/operators';
import { SecurityPluginSetup } from '../../security/server';
import { createConfig$ } from './config';
import {
  EncryptedSavedObjectsService,
  EncryptedSavedObjectTypeRegistration,
  EncryptionError,
  EncryptedSavedObjectsMigrationService,
} from './crypto';
import { EncryptedSavedObjectsAuditLogger } from './audit';
import { setupSavedObjects, ClientInstanciator } from './saved_objects';
import { getCreateMigration, CreateEncryptedSavedObjectsMigrationFn } from './create_migration';

export interface PluginsSetup {
  security?: SecurityPluginSetup;
}

export interface EncryptedSavedObjectsPluginSetup {
  registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) => void;
  usingEphemeralEncryptionKey: boolean;
  createMigration: CreateEncryptedSavedObjectsMigrationFn;
}

export interface EncryptedSavedObjectsPluginStart {
  isEncryptionError: (error: Error) => boolean;
  getClient: ClientInstanciator;
}

/**
 * Represents EncryptedSavedObjects Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;
  private savedObjectsSetup!: ClientInstanciator;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(
    core: CoreSetup,
    deps: PluginsSetup
  ): Promise<EncryptedSavedObjectsPluginSetup> {
    const {
      config: { encryptionKey },
      usingEphemeralEncryptionKey,
    } = await createConfig$(this.initializerContext).pipe(first()).toPromise();

    const crypto = nodeCrypto({ encryptionKey });

    const service = Object.freeze(
      new EncryptedSavedObjectsService(
        crypto,
        this.logger,
        new EncryptedSavedObjectsAuditLogger(
          deps.security?.audit.getLogger('encryptedSavedObjects')
        )
      )
    );

    this.savedObjectsSetup = setupSavedObjects({
      service,
      savedObjects: core.savedObjects,
      security: deps.security,
      getStartServices: core.getStartServices,
    });

    return {
      registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) =>
        service.registerType(typeRegistration),
      usingEphemeralEncryptionKey,
      createMigration: getCreateMigration(
        new EncryptedSavedObjectsMigrationService(crypto, this.logger)
      ),
    };
  }

  public start() {
    this.logger.debug('Starting plugin');
    return {
      isEncryptionError: (error: Error) => error instanceof EncryptionError,
      getClient: (options = {}) => this.savedObjectsSetup(options),
    };
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
