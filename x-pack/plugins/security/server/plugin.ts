/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { TypeOf } from '@kbn/config-schema';
import {
  ICustomClusterClient,
  CoreSetup,
  Logger,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { deepFreeze } from '../../../../src/core/utils';
import { SpacesPluginSetup } from '../../spaces/server';
import { PluginSetupContract as FeaturesSetupContract } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';

import { Authentication, setupAuthentication } from './authentication';
import { Authorization, setupAuthorization } from './authorization';
import { ConfigSchema, createConfig } from './config';
import { defineRoutes } from './routes';
import { SecurityLicenseService, SecurityLicense } from '../common/licensing';
import { setupSavedObjects } from './saved_objects';
import { SecurityAuditLogger } from './audit';
import { elasticsearchClientPlugin } from './elasticsearch_client_plugin';

export type SpacesService = Pick<
  SpacesPluginSetup['spacesService'],
  'getSpaceId' | 'namespaceToSpaceId'
>;

export type FeaturesService = Pick<FeaturesSetupContract, 'getFeatures'>;

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
 * Describes public Security plugin contract returned at the `setup` stage.
 */
export interface SecurityPluginSetup {
  authc: Pick<
    Authentication,
    | 'isAuthenticated'
    | 'getCurrentUser'
    | 'areAPIKeysEnabled'
    | 'createAPIKey'
    | 'invalidateAPIKey'
    | 'grantAPIKeyAsInternalUser'
    | 'invalidateAPIKeyAsInternalUser'
  >;
  authz: Pick<Authorization, 'actions' | 'checkPrivilegesWithRequest' | 'mode'>;
  license: SecurityLicense;

  /**
   * If Spaces plugin is available it's supposed to register its SpacesService with Security plugin
   * so that Security can get space ID from the URL or namespace. We can't declare optional dependency
   * to Spaces since it'd result into circular dependency between these two plugins and circular
   * dependencies aren't supported by the Core. In the future we have to get rid of this implicit
   * dependency.
   * @param service Spaces service exposed by the Spaces plugin.
   */
  registerSpacesService: (service: SpacesService) => void;

  __legacyCompat: {
    registerLegacyAPI: (legacyAPI: LegacyAPI) => void;
    registerPrivilegesWithCluster: () => void;
  };
}

export interface PluginSetupDependencies {
  features: FeaturesService;
  licensing: LicensingPluginSetup;
}

/**
 * Represents Security Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;
  private clusterClient?: ICustomClusterClient;
  private spacesService?: SpacesService | symbol = Symbol('not accessed');
  private securityLicenseService?: SecurityLicenseService;

  private legacyAPI?: LegacyAPI;
  private readonly getLegacyAPI = () => {
    if (!this.legacyAPI) {
      throw new Error('Legacy API is not registered!');
    }
    return this.legacyAPI;
  };

  private readonly getSpacesService = () => {
    // Changing property value from Symbol to undefined denotes the fact that property was accessed.
    if (!this.wasSpacesServiceAccessed()) {
      this.spacesService = undefined;
    }

    return this.spacesService as SpacesService | undefined;
  };

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, { features, licensing }: PluginSetupDependencies) {
    const [config, legacyConfig] = await combineLatest([
      this.initializerContext.config.create<TypeOf<typeof ConfigSchema>>().pipe(
        map(rawConfig =>
          createConfig(rawConfig, this.initializerContext.logger.get('config'), {
            isTLSEnabled: core.http.isTlsEnabled,
          })
        )
      ),
      this.initializerContext.config.legacy.globalConfig$,
    ])
      .pipe(first())
      .toPromise();

    this.clusterClient = core.elasticsearch.createClient('security', {
      plugins: [elasticsearchClientPlugin],
    });

    this.securityLicenseService = new SecurityLicenseService();
    const { license } = this.securityLicenseService.setup({
      license$: licensing.license$,
    });

    const auditLogger = new SecurityAuditLogger(() => this.getLegacyAPI().auditLogger);
    const authc = await setupAuthentication({
      auditLogger,
      http: core.http,
      clusterClient: this.clusterClient,
      config,
      license,
      loggers: this.initializerContext.logger,
    });

    const authz = await setupAuthorization({
      http: core.http,
      clusterClient: this.clusterClient,
      license,
      loggers: this.initializerContext.logger,
      kibanaIndexName: legacyConfig.kibana.index,
      packageVersion: this.initializerContext.env.packageInfo.version,
      getSpacesService: this.getSpacesService,
      featuresService: features,
    });

    setupSavedObjects({
      auditLogger,
      authz,
      savedObjects: core.savedObjects,
      getSpacesService: this.getSpacesService,
    });

    core.capabilities.registerSwitcher(authz.disableUnauthorizedCapabilities);

    defineRoutes({
      router: core.http.createRouter(),
      basePath: core.http.basePath,
      httpResources: core.http.resources,
      logger: this.initializerContext.logger.get('routes'),
      clusterClient: this.clusterClient,
      config,
      authc,
      authz,
      license,
    });

    return deepFreeze<SecurityPluginSetup>({
      authc: {
        isAuthenticated: authc.isAuthenticated,
        getCurrentUser: authc.getCurrentUser,
        areAPIKeysEnabled: authc.areAPIKeysEnabled,
        createAPIKey: authc.createAPIKey,
        invalidateAPIKey: authc.invalidateAPIKey,
        grantAPIKeyAsInternalUser: authc.grantAPIKeyAsInternalUser,
        invalidateAPIKeyAsInternalUser: authc.invalidateAPIKeyAsInternalUser,
      },

      authz: {
        actions: authz.actions,
        checkPrivilegesWithRequest: authz.checkPrivilegesWithRequest,
        mode: authz.mode,
      },

      license,

      registerSpacesService: service => {
        if (this.wasSpacesServiceAccessed()) {
          throw new Error('Spaces service has been accessed before registration.');
        }

        this.spacesService = service;
      },

      __legacyCompat: {
        registerLegacyAPI: (legacyAPI: LegacyAPI) => (this.legacyAPI = legacyAPI),

        registerPrivilegesWithCluster: async () => await authz.registerPrivilegesWithCluster(),
      },
    });
  }

  public start() {
    this.logger.debug('Starting plugin');
  }

  public stop() {
    this.logger.debug('Stopping plugin');

    if (this.clusterClient) {
      this.clusterClient.close();
      this.clusterClient = undefined;
    }

    if (this.securityLicenseService) {
      this.securityLicenseService.stop();
      this.securityLicenseService = undefined;
    }
  }

  private wasSpacesServiceAccessed() {
    return typeof this.spacesService !== 'symbol';
  }
}
