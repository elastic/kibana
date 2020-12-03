/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { TypeOf } from '@kbn/config-schema';
import { deepFreeze } from '@kbn/std';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { SecurityOssPluginSetup } from 'src/plugins/security_oss/server';
import {
  CoreSetup,
  CoreStart,
  Logger,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { SpacesPluginSetup, SpacesPluginStart } from '../../spaces/server';
import { PluginSetupContract as FeaturesSetupContract } from '../../features/server';
import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../features/server';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';

import { Authentication, setupAuthentication } from './authentication';
import { AuthorizationService, AuthorizationServiceSetup } from './authorization';
import { ConfigSchema, createConfig } from './config';
import { defineRoutes } from './routes';
import { SecurityLicenseService, SecurityLicense } from '../common/licensing';
import { setupSavedObjects } from './saved_objects';
import { AuditService, SecurityAuditLogger, AuditServiceSetup } from './audit';
import { SecurityFeatureUsageService, SecurityFeatureUsageServiceStart } from './feature_usage';
import { securityFeatures } from './features';
import { ElasticsearchService } from './elasticsearch';
import { SessionManagementService } from './session_management';
import { registerSecurityUsageCollector } from './usage_collector';
import { setupSpacesClient } from './spaces';

export type SpacesService = Pick<
  SpacesPluginSetup['spacesService'],
  'getSpaceId' | 'namespaceToSpaceId'
>;

export type FeaturesService = Pick<
  FeaturesSetupContract,
  'getKibanaFeatures' | 'getElasticsearchFeatures'
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
  authz: Pick<
    AuthorizationServiceSetup,
    'actions' | 'checkPrivilegesDynamicallyWithRequest' | 'checkPrivilegesWithRequest' | 'mode'
  >;
  license: SecurityLicense;
  audit: AuditServiceSetup;
}

export interface PluginSetupDependencies {
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  taskManager: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
  securityOss?: SecurityOssPluginSetup;
  spaces?: SpacesPluginSetup;
}

export interface PluginStartDependencies {
  features: FeaturesPluginStart;
  licensing: LicensingPluginStart;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
}

/**
 * Represents Security Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;
  private securityLicenseService?: SecurityLicenseService;
  private authc?: Authentication;

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
  private readonly elasticsearchService = new ElasticsearchService(
    this.initializerContext.logger.get('elasticsearch')
  );
  private readonly sessionManagementService = new SessionManagementService(
    this.initializerContext.logger.get('session')
  );

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(
    core: CoreSetup<PluginStartDependencies>,
    {
      features,
      licensing,
      taskManager,
      usageCollection,
      securityOss,
      spaces,
    }: PluginSetupDependencies
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

    this.securityLicenseService = new SecurityLicenseService();
    const { license } = this.securityLicenseService.setup({
      license$: licensing.license$,
    });

    if (securityOss) {
      license.features$.subscribe(({ allowRbac }) => {
        const showInsecureClusterWarning = !allowRbac;
        securityOss.showInsecureClusterWarning$.next(showInsecureClusterWarning);
      });
    }

    securityFeatures.forEach((securityFeature) =>
      features.registerElasticsearchFeature(securityFeature)
    );

    const { clusterClient } = this.elasticsearchService.setup({
      elasticsearch: core.elasticsearch,
      license,
      status: core.status,
    });

    this.featureUsageService.setup({ featureUsage: licensing.featureUsage });

    registerSecurityUsageCollector({ usageCollection, config, license });

    const audit = this.auditService.setup({
      license,
      config: config.audit,
      logging: core.logging,
      http: core.http,
      getSpaceId: (request) => spaces?.spacesService.getSpaceId(request),
      getCurrentUser: (request) => this.authc?.getCurrentUser(request),
    });
    const legacyAuditLogger = new SecurityAuditLogger(audit.getLogger());

    const { session } = this.sessionManagementService.setup({
      config,
      clusterClient,
      http: core.http,
      kibanaIndexName: legacyConfig.kibana.index,
      taskManager,
    });

    this.authc = await setupAuthentication({
      legacyAuditLogger,
      audit,
      getFeatureUsageService: this.getFeatureUsageService,
      http: core.http,
      clusterClient,
      config,
      license,
      loggers: this.initializerContext.logger,
      session,
    });

    const authz = this.authorizationService.setup({
      http: core.http,
      capabilities: core.capabilities,
      clusterClient,
      license,
      loggers: this.initializerContext.logger,
      kibanaIndexName: legacyConfig.kibana.index,
      packageVersion: this.initializerContext.env.packageInfo.version,
      buildNumber: this.initializerContext.env.packageInfo.buildNum,
      getSpacesService: () => spaces?.spacesService,
      features,
      getCurrentUser: this.authc.getCurrentUser,
    });

    setupSpacesClient({
      spaces,
      audit,
      authz,
    });

    setupSavedObjects({
      legacyAuditLogger,
      audit,
      authz,
      savedObjects: core.savedObjects,
      getSpacesService: () => spaces?.spacesService,
    });

    defineRoutes({
      router: core.http.createRouter(),
      basePath: core.http.basePath,
      httpResources: core.http.resources,
      logger: this.initializerContext.logger.get('routes'),
      config,
      authc: this.authc,
      authz,
      license,
      session,
      getFeatures: () =>
        core
          .getStartServices()
          .then(([, { features: featuresStart }]) => featuresStart.getKibanaFeatures()),
      getFeatureUsageService: this.getFeatureUsageService,
    });

    return deepFreeze<SecurityPluginSetup>({
      audit: {
        asScoped: audit.asScoped,
        getLogger: audit.getLogger,
      },

      authc: {
        isAuthenticated: this.authc.isAuthenticated,
        getCurrentUser: this.authc.getCurrentUser,
        areAPIKeysEnabled: this.authc.areAPIKeysEnabled,
        createAPIKey: this.authc.createAPIKey,
        invalidateAPIKey: this.authc.invalidateAPIKey,
        grantAPIKeyAsInternalUser: this.authc.grantAPIKeyAsInternalUser,
        invalidateAPIKeyAsInternalUser: this.authc.invalidateAPIKeyAsInternalUser,
      },

      authz: {
        actions: authz.actions,
        checkPrivilegesWithRequest: authz.checkPrivilegesWithRequest,
        checkPrivilegesDynamicallyWithRequest: authz.checkPrivilegesDynamicallyWithRequest,
        mode: authz.mode,
      },

      license,
    });
  }

  public start(core: CoreStart, { features, licensing, taskManager }: PluginStartDependencies) {
    this.logger.debug('Starting plugin');

    this.featureUsageServiceStart = this.featureUsageService.start({
      featureUsage: licensing.featureUsage,
    });

    const { clusterClient, watchOnlineStatus$ } = this.elasticsearchService.start();

    this.sessionManagementService.start({ online$: watchOnlineStatus$(), taskManager });
    this.authorizationService.start({ features, clusterClient, online$: watchOnlineStatus$() });
  }

  public stop() {
    this.logger.debug('Stopping plugin');

    if (this.securityLicenseService) {
      this.securityLicenseService.stop();
      this.securityLicenseService = undefined;
    }

    if (this.featureUsageServiceStart) {
      this.featureUsageServiceStart = undefined;
    }

    this.auditService.stop();
    this.authorizationService.stop();
    this.elasticsearchService.stop();
    this.sessionManagementService.stop();
  }
}
