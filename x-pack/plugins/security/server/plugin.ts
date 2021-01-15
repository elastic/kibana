/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { TypeOf } from '@kbn/config-schema';
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

import {
  AuthenticationService,
  AuthenticationServiceSetup,
  AuthenticationServiceStart,
} from './authentication';
import { AuthorizationService, AuthorizationServiceSetup } from './authorization';
import { AnonymousAccessService, AnonymousAccessServiceStart } from './anonymous_access';
import { ConfigSchema, ConfigType, createConfig } from './config';
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
  /**
   * @deprecated Use `authc` methods from the `SecurityServiceStart` contract instead.
   */
  authc: Pick<AuthenticationServiceSetup, 'getCurrentUser'>;
  /**
   * @deprecated Use `authz` methods from the `SecurityServiceStart` contract instead.
   */
  authz: Pick<
    AuthorizationServiceSetup,
    'actions' | 'checkPrivilegesDynamicallyWithRequest' | 'checkPrivilegesWithRequest' | 'mode'
  >;
  license: SecurityLicense;
  audit: AuditServiceSetup;
}

/**
 * Describes public Security plugin contract returned at the `start` stage.
 */
export interface SecurityPluginStart {
  authc: Pick<AuthenticationServiceStart, 'apiKeys' | 'getCurrentUser'>;
  authz: Pick<
    AuthorizationServiceSetup,
    'actions' | 'checkPrivilegesDynamicallyWithRequest' | 'checkPrivilegesWithRequest' | 'mode'
  >;
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
  private authenticationStart?: AuthenticationServiceStart;
  private authorizationSetup?: AuthorizationServiceSetup;
  private anonymousAccessStart?: AnonymousAccessServiceStart;
  private configSubscription?: Subscription;

  private config?: ConfigType;
  private readonly getConfig = () => {
    if (!this.config) {
      throw new Error('Config is not available.');
    }
    return this.config;
  };

  private kibanaIndexName?: string;
  private readonly getKibanaIndexName = () => {
    if (!this.kibanaIndexName) {
      throw new Error('Kibana index name is not available.');
    }
    return this.kibanaIndexName;
  };

  private readonly featureUsageService = new SecurityFeatureUsageService();
  private featureUsageServiceStart?: SecurityFeatureUsageServiceStart;
  private readonly getFeatureUsageService = () => {
    if (!this.featureUsageServiceStart) {
      throw new Error(`featureUsageServiceStart is not registered!`);
    }
    return this.featureUsageServiceStart;
  };

  private readonly auditService = new AuditService(this.initializerContext.logger.get('audit'));
  private readonly securityLicenseService = new SecurityLicenseService();
  private readonly authorizationService = new AuthorizationService();
  private readonly elasticsearchService = new ElasticsearchService(
    this.initializerContext.logger.get('elasticsearch')
  );
  private readonly sessionManagementService = new SessionManagementService(
    this.initializerContext.logger.get('session')
  );
  private readonly authenticationService = new AuthenticationService(
    this.initializerContext.logger.get('authentication')
  );
  private readonly anonymousAccessService = new AnonymousAccessService(
    this.initializerContext.logger.get('anonymous-access'),
    this.getConfig
  );

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public setup(
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
    this.configSubscription = combineLatest([
      this.initializerContext.config.create<TypeOf<typeof ConfigSchema>>().pipe(
        map((rawConfig) =>
          createConfig(rawConfig, this.initializerContext.logger.get('config'), {
            isTLSEnabled: core.http.getServerInfo().protocol === 'https',
          })
        )
      ),
      this.initializerContext.config.legacy.globalConfig$,
    ]).subscribe(([config, { kibana }]) => {
      this.config = config;
      this.kibanaIndexName = kibana.index;
    });

    const config = this.getConfig();
    const kibanaIndexName = this.getKibanaIndexName();

    // A subset of `start` services we need during `setup`.
    const startServicesPromise = core.getStartServices().then(([coreServices, depsServices]) => ({
      elasticsearch: coreServices.elasticsearch,
      features: depsServices.features,
    }));

    const { license } = this.securityLicenseService.setup({
      license$: licensing.license$,
    });

    if (securityOss) {
      license.features$.subscribe(({ allowRbac }) => {
        const showInsecureClusterWarning = !allowRbac;
        securityOss.showInsecureClusterWarning$.next(showInsecureClusterWarning);
      });

      securityOss.setAnonymousAccessServiceProvider(() => {
        if (!this.anonymousAccessStart) {
          throw new Error('AnonymousAccess service is not started!');
        }
        return this.anonymousAccessStart;
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

    const { session } = this.sessionManagementService.setup({
      config,
      clusterClient,
      http: core.http,
      kibanaIndexName,
      taskManager,
    });

    const audit = this.auditService.setup({
      license,
      config: config.audit,
      logging: core.logging,
      http: core.http,
      getSpaceId: (request) => spaces?.spacesService.getSpaceId(request),
      getSID: (request) => session.getSID(request),
      getCurrentUser: (request) => authenticationSetup.getCurrentUser(request),
      recordAuditLoggingUsage: () => this.featureUsageServiceStart?.recordAuditLoggingUsage(),
    });
    const legacyAuditLogger = new SecurityAuditLogger(audit.getLogger());

    const authenticationSetup = this.authenticationService.setup({
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

    this.anonymousAccessService.setup();

    this.authorizationSetup = this.authorizationService.setup({
      http: core.http,
      capabilities: core.capabilities,
      getClusterClient: () =>
        startServicesPromise.then(({ elasticsearch }) => elasticsearch.client),
      license,
      loggers: this.initializerContext.logger,
      kibanaIndexName,
      packageVersion: this.initializerContext.env.packageInfo.version,
      buildNumber: this.initializerContext.env.packageInfo.buildNum,
      getSpacesService: () => spaces?.spacesService,
      features,
      getCurrentUser: authenticationSetup.getCurrentUser,
    });

    setupSpacesClient({
      spaces,
      audit,
      authz: this.authorizationSetup,
    });

    setupSavedObjects({
      legacyAuditLogger,
      audit,
      authz: this.authorizationSetup,
      savedObjects: core.savedObjects,
      getSpacesService: () => spaces?.spacesService,
    });

    defineRoutes({
      router: core.http.createRouter(),
      basePath: core.http.basePath,
      httpResources: core.http.resources,
      logger: this.initializerContext.logger.get('routes'),
      config,
      authz: this.authorizationSetup,
      license,
      session,
      getFeatures: () =>
        startServicesPromise.then((services) => services.features.getKibanaFeatures()),
      getFeatureUsageService: this.getFeatureUsageService,
      getAuthenticationService: () => {
        if (!this.authenticationStart) {
          throw new Error('Authentication service is not started!');
        }

        return this.authenticationStart;
      },
    });

    return Object.freeze<SecurityPluginSetup>({
      audit: {
        asScoped: audit.asScoped,
        getLogger: audit.getLogger,
      },

      authc: { getCurrentUser: authenticationSetup.getCurrentUser },

      authz: {
        actions: this.authorizationSetup.actions,
        checkPrivilegesWithRequest: this.authorizationSetup.checkPrivilegesWithRequest,
        checkPrivilegesDynamicallyWithRequest: this.authorizationSetup
          .checkPrivilegesDynamicallyWithRequest,
        mode: this.authorizationSetup.mode,
      },

      license,
    });
  }

  public start(
    core: CoreStart,
    { features, licensing, taskManager, spaces }: PluginStartDependencies
  ) {
    this.logger.debug('Starting plugin');

    this.featureUsageServiceStart = this.featureUsageService.start({
      featureUsage: licensing.featureUsage,
    });

    const clusterClient = core.elasticsearch.client;
    const { watchOnlineStatus$ } = this.elasticsearchService.start();

    this.sessionManagementService.start({ online$: watchOnlineStatus$(), taskManager });
    this.authenticationStart = this.authenticationService.start({
      http: core.http,
      clusterClient,
    });

    this.authorizationService.start({ features, clusterClient, online$: watchOnlineStatus$() });

    this.anonymousAccessStart = this.anonymousAccessService.start({
      capabilities: core.capabilities,
      clusterClient,
      basePath: core.http.basePath,
      spaces: spaces?.spacesService,
    });

    return Object.freeze<SecurityPluginStart>({
      authc: {
        apiKeys: this.authenticationStart.apiKeys,
        getCurrentUser: this.authenticationStart.getCurrentUser,
      },
      authz: {
        actions: this.authorizationSetup!.actions,
        checkPrivilegesWithRequest: this.authorizationSetup!.checkPrivilegesWithRequest,
        checkPrivilegesDynamicallyWithRequest: this.authorizationSetup!
          .checkPrivilegesDynamicallyWithRequest,
        mode: this.authorizationSetup!.mode,
      },
    });
  }

  public stop() {
    this.logger.debug('Stopping plugin');

    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
      this.configSubscription = undefined;
    }

    if (this.featureUsageServiceStart) {
      this.featureUsageServiceStart = undefined;
    }

    if (this.authenticationStart) {
      this.authenticationStart = undefined;
    }

    if (this.anonymousAccessStart) {
      this.anonymousAccessStart = undefined;
    }

    this.securityLicenseService.stop();
    this.auditService.stop();
    this.authorizationService.stop();
    this.elasticsearchService.stop();
    this.sessionManagementService.stop();
  }
}
