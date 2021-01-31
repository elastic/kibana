/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { catchError, first, map, switchMap } from 'rxjs/operators';
import nodeCrypto from '@elastic/node-crypto';
import { TypeOf } from '@kbn/config-schema';
import { combineLatest, interval, Observable, of } from 'rxjs';
import {
  Logger,
  PluginInitializerContext,
  CoreSetup,
  ServiceStatus,
  ServiceStatusLevels,
} from '../../../../src/core/server';
import { SecurityPluginSetup } from '../../security/server';
import { createConfig, ConfigSchema } from './config';
import {
  EncryptedSavedObjectsService,
  EncryptedSavedObjectTypeRegistration,
  EncryptionError,
  EncryptionKeyRotationService,
} from './crypto';
import { EncryptedSavedObjectsAuditLogger } from './audit';
import { setupSavedObjects, ClientInstanciator } from './saved_objects';
import { getCreateMigration, CreateEncryptedSavedObjectsMigrationFn } from './create_migration';
import { defineRoutes } from './routes';

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
    const config = await this.initializerContext.config
      .create<TypeOf<typeof ConfigSchema>>()
      .pipe(
        map((rawConfig) => createConfig(rawConfig, this.initializerContext.logger.get('config')))
      )
      .pipe(first())
      .toPromise();
    const auditLogger = new EncryptedSavedObjectsAuditLogger(
      deps.security?.audit.getLogger('encryptedSavedObjects')
    );

    const primaryCrypto = nodeCrypto({ encryptionKey: config.encryptionKey });
    const decryptionOnlyCryptos = config.keyRotation.decryptionOnlyKeys.map((decryptionKey) =>
      nodeCrypto({ encryptionKey: decryptionKey })
    );

    const service = Object.freeze(
      new EncryptedSavedObjectsService({
        primaryCrypto,
        decryptionOnlyCryptos,
        logger: this.logger,
        audit: auditLogger,
      })
    );

    this.savedObjectsSetup = setupSavedObjects({
      service,
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
          service,
          getStartServices: core.getStartServices,
          security: deps.security,
        })
      ),
      config,
    });

    const externalStatus$ = interval(1000).pipe(
      switchMap(async () => {
        const resp = Promise.resolve({ ok: false });
        const body = await resp;
        if (body.ok) {
          return { level: ServiceStatusLevels.available, summary: 'External Service is up' };
        } else {
          return {
            level: ServiceStatusLevels.degraded,
            summary: 'External Service is unavailable',
          };
        }
      }),
      catchError(async (error) => ({
        level: ServiceStatusLevels.unavailable,
        meta: { error },
      }))
    );

    core.status.set(
      combineLatest([core.status.derivedStatus$, externalStatus$]).pipe(
        map(([derivedStatus, healthStatus]) => {
          if (healthStatus.level > derivedStatus.level) {
            return healthStatus as ServiceStatus;
          } else {
            return derivedStatus;
          }
        })
      )
    );

    return {
      registerType: (typeRegistration: EncryptedSavedObjectTypeRegistration) =>
        service.registerType(typeRegistration),
      usingEphemeralEncryptionKey: config.usingEphemeralEncryptionKey,
      createMigration: getCreateMigration(
        service,
        (typeRegistration: EncryptedSavedObjectTypeRegistration) => {
          const serviceForMigration = new EncryptedSavedObjectsService({
            primaryCrypto,
            decryptionOnlyCryptos,
            logger: this.logger,
            audit: auditLogger,
          });
          serviceForMigration.registerType(typeRegistration);
          return serviceForMigration;
        }
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
