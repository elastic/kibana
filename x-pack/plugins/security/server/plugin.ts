/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { TypeOf } from '@kbn/config-schema';
import {
  deepFreeze,
  ILegacyCustomClusterClient,
  CoreSetup,
  CoreStart,
  Logger,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { SpacesPluginSetup } from '../../spaces/server';
import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../features/server';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server';

import { Authentication, setupAuthentication } from './authentication';
import { AuthorizationService, AuthorizationServiceSetup } from './authorization';
import { ConfigSchema, createConfig } from './config';
import { defineRoutes } from './routes';
import { SecurityLicenseService, SecurityLicense } from '../common/licensing';
import { setupSavedObjects } from './saved_objects';
import { AuditService, SecurityAuditLogger, AuditServiceSetup } from './audit';
import { elasticsearchClientPlugin } from './elasticsearch_client_plugin';
import { SecurityFeatureUsageService, SecurityFeatureUsageServiceStart } from './feature_usage';

export type SpacesService = Pick<
  SpacesPluginSetup['spacesService'],
  'getSpaceId' | 'namespaceToSpaceId'
>;

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
  authz: Pick<AuthorizationServiceSetup, 'actions' | 'checkPrivilegesWithRequest' | 'mode'>;
  license: SecurityLicense;
  audit: Pick<AuditServiceSetup, 'getLogger'>;

  /**
   * If Spaces plugin is available it's supposed to register its SpacesService with Security plugin
   * so that Security can get space ID from the URL or namespace. We can't declare optional dependency
   * to Spaces since it'd result into circular dependency between these two plugins and circular
   * dependencies aren't supported by the Core. In the future we have to get rid of this implicit
   * dependency.
   * @param service Spaces service exposed by the Spaces plugin.
   */
  registerSpacesService: (service: SpacesService) => void;
}

export interface PluginSetupDependencies {
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface PluginStartDependencies {
  features: FeaturesPluginStart;
  licensing: LicensingPluginStart;
}

/**
 * Represents Security Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;
  private clusterClient?: ILegacyCustomClusterClient;
  private spacesService?: SpacesService | symbol = Symbol('not accessed');
  private securityLicenseService?: SecurityLicenseService;

  private readonly featureUsageService = new SecurityFeatureUsageService();
  private featureUsageServiceStart?: SecurityFeatureUsageServiceStart;
  private readonly getFeatureUsageService = () => {
    if (!this.featureUsageServiceStart) {
      throw new Error(`featureUsageServiceStart is not registered!`);
    }
    return this.featureUsageServiceStart;
  };

  private readonly auditService = new AuditService(this.initializerContext.logger.get('audit'));
  private readonly authorizationService = new AuthorizationService();

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
    core: CoreSetup<PluginStartDependencies>,
    { features, licensing }: PluginSetupDependencies
  ) {
    const [config, legacyConfig] = await combineLatest([
      this.initializerContext.config.create<TypeOf<typeof ConfigSchema>>().pipe(
        map((rawConfig) =>
          createConfig(rawConfig, this.initializerContext.logger.get('config'), {
            isTLSEnabled: core.http.getServerInfo().protocol === 'https',
          })
        )
      ),
      this.initializerContext.config.legacy.globalConfig$,
    ])
      .pipe(first())
      .toPromise();

    this.clusterClient = core.elasticsearch.legacy.createClient('security', {
      plugins: [elasticsearchClientPlugin],
    });

    this.securityLicenseService = new SecurityLicenseService();
    const { license } = this.securityLicenseService.setup({
      license$: licensing.license$,
    });

    this.featureUsageService.setup({ featureUsage: licensing.featureUsage });

    const audit = this.auditService.setup({ license, config: config.audit });
    const auditLogger = new SecurityAuditLogger(audit.getLogger());

    const authc = await setupAuthentication({
      auditLogger,
      getFeatureUsageService: this.getFeatureUsageService,
      http: core.http,
      clusterClient: this.clusterClient,
      config,
      license,
      loggers: this.initializerContext.logger,
    });

    const authz = this.authorizationService.setup({
      http: core.http,
      capabilities: core.capabilities,
      status: core.status,
      clusterClient: this.clusterClient,
      license,
      loggers: this.initializerContext.logger,
      kibanaIndexName: legacyConfig.kibana.index,
      packageVersion: this.initializerContext.env.packageInfo.version,
      getSpacesService: this.getSpacesService,
      features,
    });

    setupSavedObjects({
      auditLogger,
      authz,
      savedObjects: core.savedObjects,
      getSpacesService: this.getSpacesService,
    });

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
      getFeatures: () =>
        core
          .getStartServices()
          .then(([, { features: featuresStart }]) => featuresStart.getFeatures()),
      getFeatureUsageService: this.getFeatureUsageService,
    });

    return deepFreeze<SecurityPluginSetup>({
      audit: {
        getLogger: audit.getLogger,
      },

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

      registerSpacesService: (service) => {
        if (this.wasSpacesServiceAccessed()) {
          throw new Error('Spaces service has been accessed before registration.');
        }

        this.spacesService = service;
      },
    });
  }

  public start(core: CoreStart, { features, licensing }: PluginStartDependencies) {
    this.logger.debug('Starting plugin');
    this.featureUsageServiceStart = this.featureUsageService.start({
      featureUsage: licensing.featureUsage,
    });
    this.authorizationService.start({ features, clusterClient: this.clusterClient! });
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

    if (this.featureUsageServiceStart) {
      this.featureUsageServiceStart = undefined;
    }
    this.auditService.stop();
    this.authorizationService.stop();
  }

  private wasSpacesServiceAccessed() {
    return typeof this.spacesService !== 'symbol';
  }
}
