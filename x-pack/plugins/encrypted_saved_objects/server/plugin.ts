/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Logger,
  SavedObjectsBaseOptions,
  PluginInitializerContext,
  CoreSetup,
} from 'src/core/server';
import { first } from 'rxjs/operators';
import { SecurityPluginSetup } from '../../security/server';
import { createConfig$ } from './config';
import {
  EncryptedSavedObjectsService,
  EncryptedSavedObjectTypeRegistration,
  EncryptionError,
} from './crypto';
import { EncryptedSavedObjectsAuditLogger } from './audit';
import { SavedObjectsSetup, setupSavedObjects } from './saved_objects';

export interface PluginsSetup {
  security?: SecurityPluginSetup;
}

export interface EncryptedSavedObjectsPluginSetup {
  registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) => void;
  usingEphemeralEncryptionKey: boolean;
}

export interface EncryptedSavedObjectsPluginStart extends SavedObjectsSetup {
  isEncryptionError: (error: Error) => boolean;
}

/**
 * Represents EncryptedSavedObjects Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;
  private savedObjectsSetup!: SavedObjectsSetup;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(
    core: CoreSetup,
    deps: PluginsSetup
  ): Promise<EncryptedSavedObjectsPluginSetup> {
    const { config, usingEphemeralEncryptionKey } = await createConfig$(this.initializerContext)
      .pipe(first())
      .toPromise();

    const auditLogger = new EncryptedSavedObjectsAuditLogger(
      deps.security?.audit.createAuditLogger(this.logger)
    );

    const service = Object.freeze(
      new EncryptedSavedObjectsService(config.encryptionKey, this.logger, auditLogger)
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
    };
  }

  public start() {
    this.logger.debug('Starting plugin');

    return {
      isEncryptionError: (error: Error) => error instanceof EncryptionError,
      getDecryptedAsInternalUser: (type: string, id: string, options?: SavedObjectsBaseOptions) => {
        return this.savedObjectsSetup.getDecryptedAsInternalUser(type, id, options);
      },
    };
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
