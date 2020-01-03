/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  IClusterClient,
  CoreSetup,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  RecursiveReadonly,
} from '../../../../src/core/server';
import { deepFreeze } from '../../../../src/core/utils';
import { SpacesPluginSetup } from '../../spaces/server';
import { PluginSetupContract as FeaturesSetupContract } from '../../features/server';
import { LicensingPluginSetup } from '../../licensing/server';

import { Authentication, setupAuthentication } from './authentication';
import { Authorization, setupAuthorization } from './authorization';
import { createConfig$ } from './config';
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
  isSystemAPIRequest: (request: KibanaRequest) => boolean;
  auditLogger: {
    log: (eventType: string, message: string, data?: Record<string, unknown>) => void;
  };
}

/**
 * Describes public Security plugin contract returned at the `setup` stage.
 */
export interface PluginSetupContract {
  authc: Authentication;
  authz: Pick<Authorization, 'actions' | 'checkPrivilegesWithRequest' | 'mode'>;

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
    license: SecurityLicense;
    config: RecursiveReadonly<{
      secureCookies: boolean;
      cookieName: string;
      loginAssistanceMessage: string;
    }>;
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
  private clusterClient?: IClusterClient;
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

  public async setup(
    core: CoreSetup,
    { features, licensing }: PluginSetupDependencies
  ): Promise<RecursiveReadonly<PluginSetupContract>> {
    const [config, legacyConfig] = await combineLatest([
      createConfig$(this.initializerContext, core.http.isTlsEnabled),
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

    const authc = await setupAuthentication({
      http: core.http,
      clusterClient: this.clusterClient,
      config,
      license,
      loggers: this.initializerContext.logger,
      getLegacyAPI: this.getLegacyAPI,
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
      auditLogger: new SecurityAuditLogger(() => this.getLegacyAPI().auditLogger),
      authz,
      savedObjects: core.savedObjects,
    });

    core.capabilities.registerSwitcher(authz.disableUnauthorizedCapabilities);

    defineRoutes({
      router: core.http.createRouter(),
      basePath: core.http.basePath,
      logger: this.initializerContext.logger.get('routes'),
      clusterClient: this.clusterClient,
      config,
      authc,
      authz,
      csp: core.http.csp,
    });

    return deepFreeze({
      authc,

      authz: {
        actions: authz.actions,
        checkPrivilegesWithRequest: authz.checkPrivilegesWithRequest,
        mode: authz.mode,
      },

      registerSpacesService: service => {
        if (this.wasSpacesServiceAccessed()) {
          throw new Error('Spaces service has been accessed before registration.');
        }

        this.spacesService = service;
      },

      __legacyCompat: {
        registerLegacyAPI: (legacyAPI: LegacyAPI) => (this.legacyAPI = legacyAPI),

        registerPrivilegesWithCluster: async () => await authz.registerPrivilegesWithCluster(),

        license,

        // We should stop exposing this config as soon as only new platform plugin consumes it. The only
        // exception may be `sessionTimeout` as other parts of the app may want to know it.
        config: {
          loginAssistanceMessage: config.loginAssistanceMessage,
          secureCookies: config.secureCookies,
          cookieName: config.cookieName,
        },
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
