/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { TypeOf } from '@kbn/config-schema';
import { RecursiveReadonly } from '@kbn/utility-types';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { SecurityOssPluginSetup } from 'src/plugins/security_oss/server';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  Plugin,
} from '../../../../src/core/server';
import { SpacesPluginSetup, SpacesPluginStart } from '../../spaces/server';
import { PluginSetupContract as FeaturesSetupContract } from '../../features/server';
import {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../features/server';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';

import { AuthenticationService, AuthenticationServiceStart } from './authentication';
import { AuthorizationService, AuthorizationServiceSetup } from './authorization';
import { AnonymousAccessService, AnonymousAccessServiceStart } from './anonymous_access';
import { ConfigSchema, ConfigType, createConfig } from './config';
import { defineRoutes } from './routes';
import { SecurityLicenseService, SecurityLicense } from '../common/licensing';
import { AuthenticatedUser } from '../common/model';
import { setupSavedObjects } from './saved_objects';
import { AuditService, SecurityAuditLogger, AuditServiceSetup } from './audit';
import { SecurityFeatureUsageService, SecurityFeatureUsageServiceStart } from './feature_usage';
import { securityFeatures } from './features';
import { ElasticsearchService } from './elasticsearch';
import { Session, SessionManagementService } from './session_management';
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
  authc: { getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null };
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
export class SecurityPlugin
  implements
    Plugin<
      RecursiveReadonly<SecurityPluginSetup>,
      RecursiveReadonly<SecurityPluginStart>,
      PluginSetupDependencies
    > {
  private readonly logger: Logger;
  private authorizationSetup?: AuthorizationServiceSetup;
  private auditSetup?: AuditServiceSetup;
  private anonymousAccessStart?: AnonymousAccessServiceStart;
  private configSubscription?: Subscription;

  private config?: ConfigType;
  private readonly getConfig = () => {
    if (!this.config) {
      throw new Error('Config is not available.');
    }
    return this.config;
  };

  private session?: Session;
  private readonly getSession = () => {
    if (!this.session) {
      throw new Error('Session is not available.');
    }
    return this.session;
  };

  private kibanaIndexName?: string;
  private readonly getKibanaIndexName = () => {
    if (!this.kibanaIndexName) {
      throw new Error('Kibana index name is not available.');
    }
    return this.kibanaIndexName;
  };

  private readonly authenticationService = new AuthenticationService(
    this.initializerContext.logger.get('authentication')
  );
  private authenticationStart?: AuthenticationServiceStart;
  private readonly getAuthentication = () => {
    if (!this.authenticationStart) {
      throw new Error(`authenticationStart is not registered!`);
    }
    return this.authenticationStart;
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

    this.elasticsearchService.setup({ license, status: core.status });
    this.featureUsageService.setup({ featureUsage: licensing.featureUsage });
    this.sessionManagementService.setup({ config, http: core.http, taskManager });
    this.authenticationService.setup({ http: core.http, license });

    registerSecurityUsageCollector({ usageCollection, config, license });

    this.auditSetup = this.auditService.setup({
      license,
      config: config.audit,
      logging: core.logging,
      http: core.http,
      getSpaceId: (request) => spaces?.spacesService.getSpaceId(request),
      getSID: (request) => this.getSession().getSID(request),
      getCurrentUser: (request) => this.getAuthentication().getCurrentUser(request),
      recordAuditLoggingUsage: () => this.getFeatureUsageService().recordAuditLoggingUsage(),
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
      getCurrentUser: (request) => this.getAuthentication().getCurrentUser(request),
    });

    setupSpacesClient({
      spaces,
      audit: this.auditSetup,
      authz: this.authorizationSetup,
    });

    setupSavedObjects({
      legacyAuditLogger: new SecurityAuditLogger(this.auditSetup.getLogger()),
      audit: this.auditSetup,
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
      getSession: this.getSession,
      getFeatures: () =>
        startServicesPromise.then((services) => services.features.getKibanaFeatures()),
      getFeatureUsageService: this.getFeatureUsageService,
      getAuthenticationService: this.getAuthentication,
    });

    return Object.freeze<SecurityPluginSetup>({
      audit: {
        asScoped: this.auditSetup.asScoped,
        getLogger: this.auditSetup.getLogger,
      },

      authc: { getCurrentUser: (request) => this.getAuthentication().getCurrentUser(request) },

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
    const { session } = this.sessionManagementService.start({
      elasticsearchClient: clusterClient.asInternalUser,
      kibanaIndexName: this.getKibanaIndexName(),
      online$: watchOnlineStatus$(),
      taskManager,
    });
    this.session = session;

    const config = this.getConfig();
    this.authenticationStart = this.authenticationService.start({
      audit: this.auditSetup!,
      clusterClient,
      config,
      featureUsageService: this.featureUsageServiceStart,
      http: core.http,
      legacyAuditLogger: new SecurityAuditLogger(this.auditSetup!.getLogger()),
      loggers: this.initializerContext.logger,
      session,
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
    this.sessionManagementService.stop();
  }
}
