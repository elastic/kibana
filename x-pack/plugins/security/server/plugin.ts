/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Subscription } from 'rxjs';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import type { TypeOf } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';

import type { CoreSetup, CoreStart } from '../../../../src/core/server';
import type { KibanaRequest } from '../../../../src/core/server/http/router/request';
import type { Plugin, PluginInitializerContext } from '../../../../src/core/server/plugins/types';
import type { SecurityOssPluginSetup } from '../../../../src/plugins/security_oss/server/plugin';
import type { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server/plugin';
import type {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '../../features/server/plugin';
import type { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/server/types';
import type { SpacesPluginSetup, SpacesPluginStart } from '../../spaces/server/plugin';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../task_manager/server/plugin';
import type { SecurityLicense } from '../common/licensing/license_service';
import { SecurityLicenseService } from '../common/licensing/license_service';
import type { AuthenticatedUser } from '../common/model/authenticated_user';
import type { AnonymousAccessServiceStart } from './anonymous_access/anonymous_access_service';
import { AnonymousAccessService } from './anonymous_access/anonymous_access_service';
import type { AuditServiceSetup } from './audit/audit_service';
import { AuditService } from './audit/audit_service';
import { SecurityAuditLogger } from './audit/security_audit_logger';
import type {
  AuthenticationServiceStart,
  InternalAuthenticationServiceStart,
} from './authentication/authentication_service';
import { AuthenticationService } from './authentication/authentication_service';
import type {
  AuthorizationServiceSetup,
  AuthorizationServiceSetupInternal,
} from './authorization/authorization_service';
import { AuthorizationService } from './authorization/authorization_service';
import type { ConfigSchema, ConfigType } from './config';
import { createConfig } from './config';
import { ElasticsearchService } from './elasticsearch/elasticsearch_service';
import type { SecurityFeatureUsageServiceStart } from './feature_usage/feature_usage_service';
import { SecurityFeatureUsageService } from './feature_usage/feature_usage_service';
import { securityFeatures } from './features/security_features';
import { defineRoutes } from './routes';
import { setupSavedObjects } from './saved_objects';
import type { Session } from './session_management/session';
import { SessionManagementService } from './session_management/session_management_service';
import { setupSpacesClient } from './spaces/setup_spaces_client';
import { registerSecurityUsageCollector } from './usage_collector/security_usage_collector';

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
  implements Plugin<SecurityPluginSetup, SecurityPluginStart, PluginSetupDependencies> {
  private readonly logger: Logger;
  private authorizationSetup?: AuthorizationServiceSetupInternal;
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
    this.authenticationService.setup({
      http: core.http,
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
        checkSavedObjectsPrivilegesWithRequest: this.authorizationSetup
          .checkSavedObjectsPrivilegesWithRequest,
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
        checkSavedObjectsPrivilegesWithRequest: this.authorizationSetup!
          .checkSavedObjectsPrivilegesWithRequest,
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
