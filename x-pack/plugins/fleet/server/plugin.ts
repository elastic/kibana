/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  ElasticsearchServiceStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  SavedObjectsServiceStart,
  HttpServiceSetup,
  SavedObjectsClientContract,
  RequestHandlerContext,
  KibanaRequest,
} from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import { LicensingPluginSetup, ILicense } from '../../licensing/server';
import {
  EncryptedSavedObjectsPluginStart,
  EncryptedSavedObjectsPluginSetup,
} from '../../encrypted_saved_objects/server';
import { SecurityPluginSetup, SecurityPluginStart } from '../../security/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import {
  PLUGIN_ID,
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
} from './constants';
import { registerSavedObjects, registerEncryptedSavedObjects } from './saved_objects';
import {
  registerLimitedConcurrencyRoutes,
  registerEPMRoutes,
  registerPackagePolicyRoutes,
  registerDataStreamRoutes,
  registerAgentPolicyRoutes,
  registerSetupRoutes,
  registerAgentAPIRoutes,
  registerElasticAgentRoutes,
  registerEnrollmentApiKeyRoutes,
  registerInstallScriptRoutes,
  registerOutputRoutes,
  registerSettingsRoutes,
  registerAppRoutes,
} from './routes';
import {
  EsAssetReference,
  FleetConfigType,
  NewPackagePolicy,
  UpdatePackagePolicy,
} from '../common';
import {
  appContextService,
  licenseService,
  ESIndexPatternSavedObjectService,
  ESIndexPatternService,
  AgentService,
  AgentPolicyServiceInterface,
  agentPolicyService,
  packagePolicyService,
  PackageService,
} from './services';
import {
  getAgentStatusById,
  authenticateAgentWithAccessToken,
  listAgents,
  getAgent,
} from './services/agents';
import { CloudSetup } from '../../cloud/server';
import { agentCheckinState } from './services/agents/checkin/state';
import { registerFleetUsageCollector } from './collectors/register';
import { getInstallation } from './services/epm/packages';
import { makeRouterEnforcingSuperuser } from './routes/security';
import { isFleetServerSetup } from './services/fleet_server_migration';

export interface FleetSetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  features?: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface FleetStartDeps {
  encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginStart;
}

export interface FleetAppContext {
  elasticsearch: ElasticsearchServiceStart;
  encryptedSavedObjectsStart?: EncryptedSavedObjectsPluginStart;
  encryptedSavedObjectsSetup?: EncryptedSavedObjectsPluginSetup;
  security?: SecurityPluginStart;
  config$?: Observable<FleetConfigType>;
  savedObjects: SavedObjectsServiceStart;
  isProductionMode: PluginInitializerContext['env']['mode']['prod'];
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  kibanaBranch: PluginInitializerContext['env']['packageInfo']['branch'];
  cloud?: CloudSetup;
  logger?: Logger;
  httpSetup?: HttpServiceSetup;
}

export type FleetSetupContract = void;

const allSavedObjectTypes = [
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
];

/**
 * Callbacks supported by the Fleet plugin
 */
export type ExternalCallback =
  | [
      'packagePolicyCreate',
      (
        newPackagePolicy: NewPackagePolicy,
        context: RequestHandlerContext,
        request: KibanaRequest
      ) => Promise<NewPackagePolicy>
    ]
  | [
      'packagePolicyUpdate',
      (
        newPackagePolicy: UpdatePackagePolicy,
        context: RequestHandlerContext,
        request: KibanaRequest
      ) => Promise<UpdatePackagePolicy>
    ];

export type ExternalCallbacksStorage = Map<ExternalCallback[0], Set<ExternalCallback[1]>>;

/**
 * Describes public Fleet plugin contract returned at the `startup` stage.
 */
export interface FleetStartContract {
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
}

export class FleetPlugin
  implements Plugin<FleetSetupContract, FleetStartContract, FleetSetupDeps, FleetStartDeps> {
  private licensing$!: Observable<ILicense>;
  private config$: Observable<FleetConfigType>;
  private cloud: CloudSetup | undefined;
  private logger: Logger | undefined;

  private isProductionMode: FleetAppContext['isProductionMode'];
  private kibanaVersion: FleetAppContext['kibanaVersion'];
  private kibanaBranch: FleetAppContext['kibanaBranch'];
  private httpSetup: HttpServiceSetup | undefined;
  private encryptedSavedObjectsSetup: EncryptedSavedObjectsPluginSetup | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config$ = this.initializerContext.config.create<FleetConfigType>();
    this.isProductionMode = this.initializerContext.env.mode.prod;
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
    this.kibanaBranch = this.initializerContext.env.packageInfo.branch;
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, deps: FleetSetupDeps) {
    this.httpSetup = core.http;
    this.licensing$ = deps.licensing.license$;
    this.encryptedSavedObjectsSetup = deps.encryptedSavedObjects;
    this.cloud = deps.cloud;

    registerSavedObjects(core.savedObjects, deps.encryptedSavedObjects);
    registerEncryptedSavedObjects(deps.encryptedSavedObjects);

    // Register feature
    // TODO: Flesh out privileges
    if (deps.features) {
      deps.features.registerKibanaFeature({
        id: PLUGIN_ID,
        name: 'Fleet',
        category: DEFAULT_APP_CATEGORIES.management,
        app: [PLUGIN_ID, 'kibana'],
        catalogue: ['fleet'],
        privileges: {
          all: {
            api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-all`],
            app: [PLUGIN_ID, 'kibana'],
            catalogue: ['fleet'],
            savedObject: {
              all: allSavedObjectTypes,
              read: [],
            },
            ui: ['show', 'read', 'write'],
          },
          read: {
            api: [`${PLUGIN_ID}-read`],
            app: [PLUGIN_ID, 'kibana'],
            catalogue: ['fleet'], // TODO: check if this is actually available to read user
            savedObject: {
              all: [],
              read: allSavedObjectTypes,
            },
            ui: ['show', 'read'],
          },
        },
      });
    }

    const router = core.http.createRouter();

    const config = await this.config$.pipe(first()).toPromise();

    // Register usage collection
    registerFleetUsageCollector(core, config, deps.usageCollection);

    // Always register app routes for permissions checking
    registerAppRoutes(router);
    // For all the routes we enforce the user to have role superuser
    const routerSuperuserOnly = makeRouterEnforcingSuperuser(router);
    // Register rest of routes only if security is enabled
    if (deps.security) {
      registerSetupRoutes(routerSuperuserOnly, config);
      registerAgentPolicyRoutes(routerSuperuserOnly);
      registerPackagePolicyRoutes(routerSuperuserOnly);
      registerOutputRoutes(routerSuperuserOnly);
      registerSettingsRoutes(routerSuperuserOnly);
      registerDataStreamRoutes(routerSuperuserOnly);
      registerEPMRoutes(routerSuperuserOnly);

      // Conditional config routes
      if (config.agents.enabled) {
        const isESOUsingEphemeralEncryptionKey = !deps.encryptedSavedObjects;
        if (isESOUsingEphemeralEncryptionKey) {
          if (this.logger) {
            this.logger.warn(
              'Fleet APIs are disabled because the Encrypted Saved Objects plugin uses an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
            );
          }
        } else {
          // we currently only use this global interceptor if fleet is enabled
          // since it would run this func on *every* req (other plugins, CSS, etc)
          registerLimitedConcurrencyRoutes(core, config);
          registerAgentAPIRoutes(routerSuperuserOnly, config);
          registerEnrollmentApiKeyRoutes(routerSuperuserOnly);
          registerInstallScriptRoutes({
            router: routerSuperuserOnly,
            basePath: core.http.basePath,
          });
          // Do not enforce superuser role for Elastic Agent routes
          registerElasticAgentRoutes(router, config);
        }
      }
    }
  }

  public async start(core: CoreStart, plugins: FleetStartDeps): Promise<FleetStartContract> {
    await appContextService.start({
      elasticsearch: core.elasticsearch,
      encryptedSavedObjectsStart: plugins.encryptedSavedObjects,
      encryptedSavedObjectsSetup: this.encryptedSavedObjectsSetup,
      security: plugins.security,
      config$: this.config$,
      savedObjects: core.savedObjects,
      isProductionMode: this.isProductionMode,
      kibanaVersion: this.kibanaVersion,
      kibanaBranch: this.kibanaBranch,
      httpSetup: this.httpSetup,
      cloud: this.cloud,
      logger: this.logger,
    });
    licenseService.start(this.licensing$);
    agentCheckinState.start();

    const fleetServerEnabled = appContextService.getConfig()?.agents?.fleetServerEnabled;
    if (fleetServerEnabled) {
      // We need licence to be initialized before using the SO service.
      await this.licensing$.pipe(first()).toPromise();

      const fleetSetup = await isFleetServerSetup();

      if (!fleetSetup) {
        this.logger?.warn(
          'Extra setup is needed to be able to use central management for agent, please visit the Fleet app in Kibana.'
        );
      }
    }

    return {
      esIndexPatternService: new ESIndexPatternSavedObjectService(),
      packageService: {
        getInstalledEsAssetReferences: async (
          savedObjectsClient: SavedObjectsClientContract,
          pkgName: string
        ): Promise<EsAssetReference[]> => {
          const installation = await getInstallation({ savedObjectsClient, pkgName });
          return installation?.installed_es || [];
        },
      },
      agentService: {
        getAgent,
        listAgents,
        getAgentStatusById,
        authenticateAgentWithAccessToken,
      },
      agentPolicyService: {
        get: agentPolicyService.get,
        list: agentPolicyService.list,
        getDefaultAgentPolicyId: agentPolicyService.getDefaultAgentPolicyId,
        getFullAgentPolicy: agentPolicyService.getFullAgentPolicy,
      },
      packagePolicyService,
      registerExternalCallback: (type: ExternalCallback[0], callback: ExternalCallback[1]) => {
        return appContextService.addExternalCallback(type, callback);
      },
    };
  }

  public async stop() {
    appContextService.stop();
    licenseService.stop();
    agentCheckinState.stop();
  }
}
