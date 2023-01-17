/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { take, filter } from 'rxjs/operators';

import { i18n } from '@kbn/i18n';
import type {
  CoreSetup,
  CoreStart,
  ElasticsearchServiceStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  SavedObjectsServiceStart,
  HttpServiceSetup,
  KibanaRequest,
  ServiceStatus,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import type { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';

import { DEFAULT_APP_CATEGORIES, SavedObjectsClient, ServiceStatusLevels } from '@kbn/core/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type {
  EncryptedSavedObjectsPluginStart,
  EncryptedSavedObjectsPluginSetup,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import type { CloudSetup } from '@kbn/cloud-plugin/server';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

import type { SavedObjectTaggingStart } from '@kbn/saved-objects-tagging-plugin/server';

import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';

import type { FleetConfigType } from '../common/types';
import type { FleetAuthz } from '../common';
import type { ExperimentalFeatures } from '../common/experimental_features';

import { INTEGRATIONS_PLUGIN_ID } from '../common';
import { parseExperimentalConfigValue } from '../common/experimental_features';

import {
  getRouteRequiredAuthz,
  makeRouterWithFleetAuthz,
  calculateRouteAuthz,
  getAuthzFromRequest,
} from './services/security';

import {
  PLUGIN_ID,
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  ASSETS_SAVED_OBJECT_TYPE,
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
  DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
  FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
} from './constants';
import { registerSavedObjects, registerEncryptedSavedObjects } from './saved_objects';
import { registerRoutes } from './routes';

import type { ExternalCallback, FleetRequestHandlerContext } from './types';
import type {
  ESIndexPatternService,
  AgentService,
  AgentPolicyServiceInterface,
  PackageService,
} from './services';
import { FleetUsageSender } from './services';
import {
  appContextService,
  licenseService,
  ESIndexPatternSavedObjectService,
  agentPolicyService,
  packagePolicyService,
  AgentServiceImpl,
  PackageServiceImpl,
} from './services';
import {
  registerFleetUsageCollector,
  fetchAgentsUsage,
  fetchFleetUsage,
} from './collectors/register';
import { FleetArtifactsClient } from './services/artifacts';
import type { FleetRouter } from './types/request_context';
import { TelemetryEventsSender } from './telemetry/sender';
import { setupFleet } from './services/setup';
import { BulkActionsResolver } from './services/agents';
import type { PackagePolicyService } from './services/package_policy_service';
import { PackagePolicyServiceImpl } from './services/package_policy';
import { registerFleetUsageLogger, startFleetUsageLogger } from './services/fleet_usage_logger';
import { CheckDeletedFilesTask } from './tasks/check_deleted_files_task';

export interface FleetSetupDeps {
  security: SecurityPluginSetup;
  features?: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
  spaces?: SpacesPluginStart;
  telemetry?: TelemetryPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface FleetStartDeps {
  data: DataPluginStart;
  licensing: LicensingPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security: SecurityPluginStart;
  telemetry?: TelemetryPluginStart;
  savedObjectsTagging: SavedObjectTaggingStart;
  taskManager: TaskManagerStartContract;
}

export interface FleetAppContext {
  elasticsearch: ElasticsearchServiceStart;
  data: DataPluginStart;
  encryptedSavedObjectsStart?: EncryptedSavedObjectsPluginStart;
  encryptedSavedObjectsSetup?: EncryptedSavedObjectsPluginSetup;
  securitySetup: SecurityPluginSetup;
  securityStart: SecurityPluginStart;
  config$?: Observable<FleetConfigType>;
  configInitialValue: FleetConfigType;
  experimentalFeatures: ExperimentalFeatures;
  savedObjects: SavedObjectsServiceStart;
  savedObjectsTagging?: SavedObjectTaggingStart;
  isProductionMode: PluginInitializerContext['env']['mode']['prod'];
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  kibanaBranch: PluginInitializerContext['env']['packageInfo']['branch'];
  cloud?: CloudSetup;
  logger?: Logger;
  httpSetup?: HttpServiceSetup;
  telemetryEventsSender: TelemetryEventsSender;
  bulkActionsResolver: BulkActionsResolver;
}

export type FleetSetupContract = void;

const allSavedObjectTypes = [
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  ASSETS_SAVED_OBJECT_TYPE,
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
  DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
  FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
];

/**
 * Describes public Fleet plugin contract returned at the `startup` stage.
 */
export interface FleetStartContract {
  /**
   * returns a promise that resolved when fleet setup has been completed regardless if it was successful or failed).
   * Any consumer of fleet start services should first `await` for this promise to be resolved before using those
   * services
   */
  fleetSetupCompleted: () => Promise<void>;
  authz: {
    fromRequest(request: KibanaRequest): Promise<FleetAuthz>;
  };
  esIndexPatternService: ESIndexPatternService;
  packageService: PackageService;
  agentService: AgentService;
  /**
   * Services for Fleet's package policies
   */
  packagePolicyService: typeof packagePolicyService;
  agentPolicyService: AgentPolicyServiceInterface;
  /**
   * Register callbacks for inclusion in fleet API processing
   * @param args
   */
  registerExternalCallback: (...args: ExternalCallback) => void;

  /**
   * Create a Fleet Artifact Client instance
   * @param packageName
   */
  createArtifactsClient: (packageName: string) => FleetArtifactsClient;
}

export class FleetPlugin
  implements Plugin<FleetSetupContract, FleetStartContract, FleetSetupDeps, FleetStartDeps>
{
  private config$: Observable<FleetConfigType>;
  private configInitialValue: FleetConfigType;
  private cloud?: CloudSetup;
  private logger?: Logger;

  private isProductionMode: FleetAppContext['isProductionMode'];
  private kibanaVersion: FleetAppContext['kibanaVersion'];
  private kibanaBranch: FleetAppContext['kibanaBranch'];
  private httpSetup?: HttpServiceSetup;
  private securitySetup!: SecurityPluginSetup;
  private encryptedSavedObjectsSetup?: EncryptedSavedObjectsPluginSetup;
  private readonly telemetryEventsSender: TelemetryEventsSender;
  private readonly fleetStatus$: BehaviorSubject<ServiceStatus>;
  private bulkActionsResolver?: BulkActionsResolver;
  private fleetUsageSender?: FleetUsageSender;
  private checkDeletedFilesTask?: CheckDeletedFilesTask;

  private agentService?: AgentService;
  private packageService?: PackageService;
  private packagePolicyService?: PackagePolicyService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config$ = this.initializerContext.config.create<FleetConfigType>();
    this.isProductionMode = this.initializerContext.env.mode.prod;
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
    this.kibanaBranch = this.initializerContext.env.packageInfo.branch;
    this.logger = this.initializerContext.logger.get();
    this.configInitialValue = this.initializerContext.config.get();
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger.get('telemetry_events'));

    this.fleetStatus$ = new BehaviorSubject<ServiceStatus>({
      level: ServiceStatusLevels.unavailable,
      summary: 'Fleet is unavailable',
    });
  }

  public setup(core: CoreSetup, deps: FleetSetupDeps) {
    this.httpSetup = core.http;
    this.encryptedSavedObjectsSetup = deps.encryptedSavedObjects;
    this.cloud = deps.cloud;
    this.securitySetup = deps.security;
    const config = this.configInitialValue;

    core.status.set(this.fleetStatus$.asObservable());

    registerSavedObjects(core.savedObjects, deps.encryptedSavedObjects);
    registerEncryptedSavedObjects(deps.encryptedSavedObjects);

    // Register feature
    if (deps.features) {
      deps.features.registerKibanaFeature({
        id: `fleetv2`,
        name: 'Fleet',
        category: DEFAULT_APP_CATEGORIES.management,
        app: [PLUGIN_ID],
        catalogue: ['fleet'],
        privilegesTooltip: i18n.translate('xpack.fleet.serverPlugin.privilegesTooltip', {
          defaultMessage: 'All Spaces is required for Fleet access.',
        }),
        reserved: {
          description:
            'Privilege to setup Fleet packages and configured policies. Intended for use by the elastic/fleet-server service account only.',
          privileges: [
            {
              id: 'fleet-setup',
              privilege: {
                excludeFromBasePrivileges: true,
                api: ['fleet-setup'],
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
              },
            },
          ],
        },
        privileges: {
          all: {
            api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-all`],
            app: [PLUGIN_ID],
            requireAllSpaces: true,
            catalogue: ['fleet'],
            savedObject: {
              all: allSavedObjectTypes,
              read: [],
            },
            ui: ['read', 'all'],
          },
          read: {
            api: [`${PLUGIN_ID}-read`],
            app: [PLUGIN_ID],
            catalogue: ['fleet'],
            requireAllSpaces: true,
            savedObject: {
              all: [],
              read: allSavedObjectTypes,
            },
            ui: ['read'],
            disabled: true,
          },
        },
      });

      deps.features.registerKibanaFeature({
        id: 'fleet', // for BWC
        name: 'Integrations',
        category: DEFAULT_APP_CATEGORIES.management,
        app: [INTEGRATIONS_PLUGIN_ID],
        catalogue: ['fleet'],
        privileges: {
          all: {
            api: [`${INTEGRATIONS_PLUGIN_ID}-read`, `${INTEGRATIONS_PLUGIN_ID}-all`],
            app: [INTEGRATIONS_PLUGIN_ID],
            catalogue: ['fleet'],
            savedObject: {
              all: allSavedObjectTypes,
              read: [],
            },
            ui: ['read', 'all'],
          },
          read: {
            api: [`${INTEGRATIONS_PLUGIN_ID}-read`],
            app: [INTEGRATIONS_PLUGIN_ID],
            catalogue: ['fleet'],
            savedObject: {
              all: [],
              read: allSavedObjectTypes,
            },
            ui: ['read'],
          },
        },
        subFeatures: [],
      });
    }

    core.http.registerRouteHandlerContext<FleetRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      async (context, request) => {
        const plugin = this;
        const coreContext = await context.core;
        const authz = await getAuthzFromRequest(request);
        const esClient = coreContext.elasticsearch.client;
        const soClient = coreContext.savedObjects.getClient();
        const routeRequiredAuthz = getRouteRequiredAuthz(request.route.method, request.route.path);
        const routeAuthz = routeRequiredAuthz
          ? calculateRouteAuthz(authz, routeRequiredAuthz)
          : undefined;

        const getInternalSoClient = (): SavedObjectsClientContract =>
          appContextService
            .getSavedObjects()
            .getScopedClient(request, { excludedExtensions: [SECURITY_EXTENSION_ID] });

        return {
          get agentClient() {
            const agentService = plugin.setupAgentService(esClient.asInternalUser, soClient);

            return {
              asCurrentUser: agentService.asScoped(request),
              asInternalUser: agentService.asInternalUser,
            };
          },
          get packagePolicyService() {
            const service = plugin.setupPackagePolicyService();

            return {
              asCurrentUser: service.asScoped(request),
              asInternalUser: service.asInternalUser,
            };
          },
          authz,

          get internalSoClient() {
            // Use a lazy getter to avoid constructing this client when not used by a request handler
            return getInternalSoClient();
          },
          get spaceId() {
            return deps.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
          },

          get limitedToPackages() {
            if (routeAuthz && routeAuthz.granted) {
              return routeAuthz.scopeDataToPackages;
            }
          },
        };
      }
    );

    // Register usage collection
    registerFleetUsageCollector(core, config, deps.usageCollection);
    const fetch = async (abortController: AbortController) =>
      await fetchFleetUsage(core, config, abortController);
    this.fleetUsageSender = new FleetUsageSender(deps.taskManager, core, fetch);
    registerFleetUsageLogger(deps.taskManager, async () => fetchAgentsUsage(core, config));

    const router: FleetRouter = core.http.createRouter<FleetRequestHandlerContext>();
    // Allow read-only users access to endpoints necessary for Integrations UI
    // Only some endpoints require superuser so we pass a raw IRouter here

    // For all the routes we enforce the user to have role superuser
    const fleetAuthzRouter = makeRouterWithFleetAuthz(
      router,
      this.initializerContext.logger.get('fleet_authz_router')
    );

    registerRoutes(fleetAuthzRouter, config);

    this.telemetryEventsSender.setup(deps.telemetry);
    this.bulkActionsResolver = new BulkActionsResolver(deps.taskManager, core);
    this.checkDeletedFilesTask = new CheckDeletedFilesTask({
      core,
      taskManager: deps.taskManager,
      logFactory: this.initializerContext.logger,
    });
  }

  public start(core: CoreStart, plugins: FleetStartDeps): FleetStartContract {
    appContextService.start({
      elasticsearch: core.elasticsearch,
      data: plugins.data,
      encryptedSavedObjectsStart: plugins.encryptedSavedObjects,
      encryptedSavedObjectsSetup: this.encryptedSavedObjectsSetup,
      securitySetup: this.securitySetup,
      securityStart: plugins.security,
      configInitialValue: this.configInitialValue,
      config$: this.config$,
      experimentalFeatures: parseExperimentalConfigValue(
        this.configInitialValue.enableExperimental || []
      ),
      savedObjects: core.savedObjects,
      savedObjectsTagging: plugins.savedObjectsTagging,
      isProductionMode: this.isProductionMode,
      kibanaVersion: this.kibanaVersion,
      kibanaBranch: this.kibanaBranch,
      httpSetup: this.httpSetup,
      cloud: this.cloud,
      logger: this.logger,
      telemetryEventsSender: this.telemetryEventsSender,
      bulkActionsResolver: this.bulkActionsResolver!,
    });
    licenseService.start(plugins.licensing.license$);

    this.telemetryEventsSender.start(plugins.telemetry, core);
    this.bulkActionsResolver?.start(plugins.taskManager);
    this.fleetUsageSender?.start(plugins.taskManager);
    this.checkDeletedFilesTask?.start({ taskManager: plugins.taskManager });
    startFleetUsageLogger(plugins.taskManager);

    const logger = appContextService.getLogger();

    const fleetSetupPromise = (async () => {
      try {
        // Fleet remains `available` during setup as to excessively delay Kibana's boot process.
        // This should be reevaluated as Fleet's setup process is optimized and stabilized.
        this.fleetStatus$.next({
          level: ServiceStatusLevels.available,
          summary: 'Fleet is setting up',
        });

        // We need to wait for the licence feature to be available,
        // to have our internal saved object client with encrypted saved object working properly
        await plugins.licensing.license$
          .pipe(
            filter(
              (licence) =>
                licence.getFeature('security').isEnabled &&
                licence.getFeature('security').isAvailable
            ),
            take(1)
          )
          .toPromise();

        await setupFleet(
          new SavedObjectsClient(core.savedObjects.createInternalRepository()),
          core.elasticsearch.client.asInternalUser
        );

        this.fleetStatus$.next({
          level: ServiceStatusLevels.available,
          summary: 'Fleet is available',
        });
      } catch (error) {
        logger.warn('Fleet setup failed');
        logger.warn(error);

        this.fleetStatus$.next({
          // As long as Fleet has a dependency on EPR, we can't reliably set Kibana status to `unavailable` here.
          // See https://github.com/elastic/kibana/issues/120237
          level: ServiceStatusLevels.available,
          summary: 'Fleet setup failed',
          meta: {
            error: error.message,
          },
        });
      }
    })();

    const internalSoClient = new SavedObjectsClient(core.savedObjects.createInternalRepository());
    return {
      authz: {
        fromRequest: getAuthzFromRequest,
      },
      fleetSetupCompleted: () => fleetSetupPromise,
      esIndexPatternService: new ESIndexPatternSavedObjectService(),
      packageService: this.setupPackageService(
        core.elasticsearch.client.asInternalUser,
        internalSoClient
      ),
      agentService: this.setupAgentService(
        core.elasticsearch.client.asInternalUser,
        internalSoClient
      ),
      agentPolicyService: {
        get: agentPolicyService.get,
        list: agentPolicyService.list,
        getFullAgentPolicy: agentPolicyService.getFullAgentPolicy,
        getByIds: agentPolicyService.getByIDs,
      },
      packagePolicyService,
      registerExternalCallback: (type: ExternalCallback[0], callback: ExternalCallback[1]) => {
        return appContextService.addExternalCallback(type, callback);
      },
      createArtifactsClient(packageName: string) {
        return new FleetArtifactsClient(core.elasticsearch.client.asInternalUser, packageName);
      },
    };
  }

  public async stop() {
    appContextService.stop();
    licenseService.stop();
    this.telemetryEventsSender.stop();
    this.fleetStatus$.complete();
  }

  private setupAgentService(
    internalEsClient: ElasticsearchClient,
    internalSoClient: SavedObjectsClientContract
  ): AgentService {
    if (this.agentService) {
      return this.agentService;
    }

    this.agentService = new AgentServiceImpl(internalEsClient, internalSoClient);
    return this.agentService;
  }

  private setupPackagePolicyService(): PackagePolicyService {
    if (this.packagePolicyService) {
      return this.packagePolicyService;
    }
    this.packagePolicyService = new PackagePolicyServiceImpl();
    return this.packagePolicyService;
  }

  private setupPackageService(
    internalEsClient: ElasticsearchClient,
    internalSoClient: SavedObjectsClientContract
  ): PackageService {
    if (this.packageService) {
      return this.packageService;
    }

    this.packageService = new PackageServiceImpl(
      internalEsClient,
      internalSoClient,
      this.getLogger()
    );
    return this.packageService!;
  }

  private getLogger(): Logger {
    if (!this.logger) {
      this.logger = this.initializerContext.logger.get();
    }

    return this.logger;
  }
}
