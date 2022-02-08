/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import type { TypeOf } from '@kbn/config-schema';
import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'src/core/server';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import type {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../features/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '../../spaces/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import type { AuthenticatedUser, PrivilegeDeprecationsService, SecurityLicense } from '../common';
import { SecurityLicenseService } from '../common/licensing';
import type { AnonymousAccessServiceStart } from './anonymous_access';
import { AnonymousAccessService } from './anonymous_access';
import type { AuditServiceSetup } from './audit';
import { AuditService } from './audit';
import type {
  AuthenticationServiceStart,
  InternalAuthenticationServiceStart,
} from './authentication';
import { AuthenticationService } from './authentication';
import type { AuthorizationServiceSetup, AuthorizationServiceSetupInternal } from './authorization';
import { AuthorizationService } from './authorization';
import type { ConfigSchema, ConfigType } from './config';
import { createConfig } from './config';
import { getPrivilegeDeprecationsService, registerKibanaUserRoleDeprecation } from './deprecations';
import { ElasticsearchService } from './elasticsearch';
import type { SecurityFeatureUsageServiceStart } from './feature_usage';
import { SecurityFeatureUsageService } from './feature_usage';
import { securityFeatures } from './features';
import { defineRoutes } from './routes';
import { setupSavedObjects } from './saved_objects';
import type { Session } from './session_management';
import { SessionManagementService } from './session_management';
import { setupSpacesClient } from './spaces';
import { registerSecurityUsageCollector } from './usage_collector';

export type SpacesService = Pick<
  SpacesPluginSetup['spacesService'],
  'getSpaceId' | 'namespaceToSpaceId'
>;

export type FeaturesService = Pick<
  FeaturesPluginSetup,
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
  authz: AuthorizationServiceSetup;
  /**
   * Exposes information about the available security features under the current license.
   */
  license: SecurityLicense;
  /**
   * Exposes services for audit logging.
   */
  audit: AuditServiceSetup;
  /**
   * Exposes services to access kibana roles per feature id with the GetDeprecationsContext
   */
  privilegeDeprecationsService: PrivilegeDeprecationsService;
}

/**
 * Describes public Security plugin contract returned at the `start` stage.
 */
export interface SecurityPluginStart {
  /**
   * Authentication services to confirm the user is who they say they are.
   */
  authc: AuthenticationServiceStart;
  /**
   * Authorization services to manage and access the permissions a particular user has.
   */
  authz: AuthorizationServiceSetup;
}

export interface PluginSetupDependencies {
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  taskManager: TaskManagerSetupContract;
  usageCollection?: UsageCollectionSetup;
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
  implements Plugin<SecurityPluginSetup, SecurityPluginStart, PluginSetupDependencies>
{
  private readonly logger: Logger;
  private authorizationSetup?: AuthorizationServiceSetupInternal;
  private auditSetup?: AuditServiceSetup;
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

  private readonly authenticationService: AuthenticationService;
  private authenticationStart?: InternalAuthenticationServiceStart;
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

  private readonly auditService: AuditService;
  private readonly securityLicenseService = new SecurityLicenseService();
  private readonly authorizationService = new AuthorizationService();
  private readonly elasticsearchService: ElasticsearchService;
  private readonly sessionManagementService: SessionManagementService;
  private readonly anonymousAccessService: AnonymousAccessService;
  private anonymousAccessStart?: AnonymousAccessServiceStart;
  private readonly getAnonymousAccess = () => {
    if (!this.anonymousAccessStart) {
      throw new Error(`anonymousAccessStart is not registered!`);
    }
    return this.anonymousAccessStart;
  };

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();

    this.authenticationService = new AuthenticationService(
      this.initializerContext.logger.get('authentication')
    );
    this.auditService = new AuditService(this.initializerContext.logger.get('audit'));
    this.elasticsearchService = new ElasticsearchService(
      this.initializerContext.logger.get('elasticsearch')
    );
    this.sessionManagementService = new SessionManagementService(
      this.initializerContext.logger.get('session')
    );
    this.anonymousAccessService = new AnonymousAccessService(
      this.initializerContext.logger.get('anonymous-access'),
      this.getConfig
    );
  }

  public setup(
    core: CoreSetup<PluginStartDependencies>,
    { features, licensing, taskManager, usageCollection, spaces }: PluginSetupDependencies
  ) {
    this.kibanaIndexName = core.savedObjects.getKibanaIndex();
    const config$ = this.initializerContext.config.create<TypeOf<typeof ConfigSchema>>().pipe(
      map((rawConfig) =>
        createConfig(rawConfig, this.initializerContext.logger.get('config'), {
          isTLSEnabled: core.http.getServerInfo().protocol === 'https',
        })
      )
    );
    this.configSubscription = config$.subscribe((config) => {
      this.config = config;
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

    securityFeatures.forEach((securityFeature) =>
      features.registerElasticsearchFeature(securityFeature)
    );

    this.elasticsearchService.setup({ license, status: core.status });
    this.featureUsageService.setup({ featureUsage: licensing.featureUsage });
    this.sessionManagementService.setup({ config, http: core.http, taskManager });
    this.authenticationService.setup({
      http: core.http,
      elasticsearch: core.elasticsearch,
      config,
      license,
      buildNumber: this.initializerContext.env.packageInfo.buildNum,
    });

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
      audit: this.auditSetup,
      authz: this.authorizationSetup,
      savedObjects: core.savedObjects,
      getSpacesService: () => spaces?.spacesService,
    });

    this.registerDeprecations(core, license);

    defineRoutes({
      router: core.http.createRouter(),
      basePath: core.http.basePath,
      httpResources: core.http.resources,
      logger: this.initializerContext.logger.get('routes'),
      config,
      config$,
      authz: this.authorizationSetup,
      license,
      getSession: this.getSession,
      getFeatures: () =>
        startServicesPromise.then((services) => services.features.getKibanaFeatures()),
      getFeatureUsageService: this.getFeatureUsageService,
      getAuthenticationService: this.getAuthentication,
      getAnonymousAccessService: this.getAnonymousAccess,
    });

    return Object.freeze<SecurityPluginSetup>({
      audit: this.auditSetup,
      authc: { getCurrentUser: (request) => this.getAuthentication().getCurrentUser(request) },
      authz: {
        actions: this.authorizationSetup.actions,
        checkPrivilegesWithRequest: this.authorizationSetup.checkPrivilegesWithRequest,
        checkPrivilegesDynamicallyWithRequest:
          this.authorizationSetup.checkPrivilegesDynamicallyWithRequest,
        checkSavedObjectsPrivilegesWithRequest:
          this.authorizationSetup.checkSavedObjectsPrivilegesWithRequest,
        mode: this.authorizationSetup.mode,
      },
      license,
      privilegeDeprecationsService: getPrivilegeDeprecationsService({
        authz: this.authorizationSetup,
        getFeatures: () =>
          startServicesPromise.then((services) => services.features.getKibanaFeatures()),
        license,
        logger: this.logger.get('deprecations'),
      }),
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
      auditLogger: this.auditSetup!.withoutRequest,
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
        checkPrivilegesDynamicallyWithRequest:
          this.authorizationSetup!.checkPrivilegesDynamicallyWithRequest,
        checkSavedObjectsPrivilegesWithRequest:
          this.authorizationSetup!.checkSavedObjectsPrivilegesWithRequest,
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

  private registerDeprecations(core: CoreSetup, license: SecurityLicense) {
    const logger = this.logger.get('deprecations');
    registerKibanaUserRoleDeprecation({
      deprecationsService: core.deprecations,
      license,
      logger,
      packageInfo: this.initializerContext.env.packageInfo,
    });
  }
}
