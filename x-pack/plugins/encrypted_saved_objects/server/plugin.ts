/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, PluginInitializerContext, CoreSetup } from 'src/core/server';
import { first } from 'rxjs/operators';
import { SecurityPluginSetup } from '../../security/server';
import { createConfig$ } from './config';
import {
  EncryptedSavedObjectsService,
  EncryptedSavedObjectTypeRegistration,
  EncryptionError,
} from './crypto';
import { EncryptedSavedObjectsAuditLogger } from './audit';
import { setupSavedObjects, ClientInstanciator } from './saved_objects';

export interface PluginsSetup {
  security?: SecurityPluginSetup;
}

export interface EncryptedSavedObjectsPluginSetup {
  registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) => void;
  __legacyCompat: { registerLegacyAPI: (legacyAPI: LegacyAPI) => void };
  usingEphemeralEncryptionKey: boolean;
}

export interface EncryptedSavedObjectsPluginStart {
  isEncryptionError: (error: Error) => boolean;
  getClient: ClientInstanciator;
}

/**
 * Describes a set of APIs that is available in the legacy platform only and required by this plugin
 * to function properly.
 */
export interface LegacyAPI {
  auditLogger: {
    log: (eventType: string, message: string, data?: Record<string, unknown>) => void;
  };
}

/**
 * Represents EncryptedSavedObjects Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;
  private savedObjectsSetup!: ClientInstanciator;

  private legacyAPI?: LegacyAPI;
  private readonly getLegacyAPI = () => {
    if (!this.legacyAPI) {
      throw new Error('Legacy API is not registered!');
    }
    return this.legacyAPI;
  };

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

    const service = Object.freeze(
      new EncryptedSavedObjectsService(
        config.encryptionKey,
        this.logger,
        new EncryptedSavedObjectsAuditLogger(() => this.getLegacyAPI().auditLogger)
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
      __legacyCompat: { registerLegacyAPI: (legacyAPI: LegacyAPI) => (this.legacyAPI = legacyAPI) },
      usingEphemeralEncryptionKey,
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
