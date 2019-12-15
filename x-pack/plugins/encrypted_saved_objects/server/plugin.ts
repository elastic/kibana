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
  SavedObjectsLegacyService,
  KibanaRequest,
  LegacyRequest,
} from 'src/core/server';
import { first } from 'rxjs/operators';
import { createConfig$ } from './config';
import {
  EncryptedSavedObjectsService,
  EncryptedSavedObjectTypeRegistration,
  EncryptionError,
} from './crypto';
import { EncryptedSavedObjectsAuditLogger } from './audit';
import { SavedObjectsSetup, setupSavedObjects } from './saved_objects';

export interface PluginSetupContract {
  registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) => void;
  __legacyCompat: { registerLegacyAPI: (legacyAPI: LegacyAPI) => void };
}

export interface PluginStartContract extends SavedObjectsSetup {
  isEncryptionError: (error: Error) => boolean;
}

/**
 * Describes a set of APIs that is available in the legacy platform only and required by this plugin
 * to function properly.
 */
export interface LegacyAPI {
  savedObjects: SavedObjectsLegacyService<KibanaRequest | LegacyRequest>;
  auditLogger: {
    log: (eventType: string, message: string, data?: Record<string, unknown>) => void;
  };
}

/**
 * Represents EncryptedSavedObjects Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;
  private savedObjectsSetup?: ReturnType<typeof setupSavedObjects>;

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

  public async setup(core: CoreSetup): Promise<PluginSetupContract> {
    const config = await createConfig$(this.initializerContext)
      .pipe(first())
      .toPromise();
    const adminClusterClient = await core.elasticsearch.adminClient$.pipe(first()).toPromise();

    const service = Object.freeze(
      new EncryptedSavedObjectsService(
        config.encryptionKey,
        this.logger,
        new EncryptedSavedObjectsAuditLogger(() => this.getLegacyAPI().auditLogger)
      )
    );

    return {
      registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) =>
        service.registerType(typeRegistration),
      __legacyCompat: {
        registerLegacyAPI: (legacyAPI: LegacyAPI) => {
          this.legacyAPI = legacyAPI;
          this.savedObjectsSetup = setupSavedObjects({
            adminClusterClient,
            service,
            savedObjects: legacyAPI.savedObjects,
          });
        },
      },
    };
  }

  public start() {
    this.logger.debug('Starting plugin');

    return {
      isEncryptionError: (error: Error) => error instanceof EncryptionError,
      getDecryptedAsInternalUser: (type: string, id: string, options?: SavedObjectsBaseOptions) => {
        if (!this.savedObjectsSetup) {
          throw new Error('Legacy SavedObjects API is not registered!');
        }

        return this.savedObjectsSetup.getDecryptedAsInternalUser(type, id, options);
      },
    };
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
