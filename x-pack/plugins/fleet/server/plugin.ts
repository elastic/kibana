/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { Observable } from 'rxjs';

import type { CoreSetup, CoreStart } from '../../../../src/core/server';
import type { ElasticsearchServiceStart } from '../../../../src/core/server/elasticsearch/types';
import type { HttpServiceSetup } from '../../../../src/core/server/http/types';
import type {
  AsyncPlugin,
  PluginInitializerContext,
} from '../../../../src/core/server/plugins/types';
import type { SavedObjectsServiceStart } from '../../../../src/core/server/saved_objects/saved_objects_service';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils/default_app_categories';
import type { DataPluginStart } from '../../../../src/plugins/data/server/plugin';
import type { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server/plugin';
import type { CloudSetup } from '../../cloud/server/plugin';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../encrypted_saved_objects/server/plugin';
import type { PluginSetupContract as FeaturesPluginSetup } from '../../features/server/plugin';
import type { ILicense } from '../../licensing/common/types';
import type { LicensingPluginSetup } from '../../licensing/server/types';
import type { SecurityPluginSetup, SecurityPluginStart } from '../../security/server/plugin';
import { AGENT_SAVED_OBJECT_TYPE } from '../common/constants/agent';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../common/constants/agent_policy';
import { ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE } from '../common/constants/enrollment_api_key';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../common/constants/epm';
import { OUTPUT_SAVED_OBJECT_TYPE } from '../common/constants/output';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../common/constants/package_policy';
import { INTEGRATIONS_PLUGIN_ID, PLUGIN_ID } from '../common/constants/plugin';
import { PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE } from '../common/constants/preconfiguration';
import type { FleetConfigType } from '../common/types';

import { registerFleetUsageCollector } from './collectors/register';
import { registerAPIRoutes as registerAgentAPIRoutes } from './routes/agent';
import { registerRoutes as registerAgentPolicyRoutes } from './routes/agent_policy';
import { registerRoutes as registerAppRoutes } from './routes/app';
import { registerRoutes as registerDataStreamRoutes } from './routes/data_streams';
import { registerRoutes as registerEnrollmentApiKeyRoutes } from './routes/enrollment_api_key';
import { registerRoutes as registerEPMRoutes } from './routes/epm';
import { registerRoutes as registerOutputRoutes } from './routes/output';
import { registerRoutes as registerPackagePolicyRoutes } from './routes/package_policy';
import { registerRoutes as registerPreconfigurationRoutes } from './routes/preconfiguration';
import { makeRouterEnforcingSuperuser } from './routes/security';
import { registerRoutes as registerSettingsRoutes } from './routes/settings';
import { registerRoutes as registerSetupRoutes } from './routes/setup';
import { registerEncryptedSavedObjects, registerSavedObjects } from './saved_objects';
import type {
  AgentPolicyServiceInterface,
  AgentService,
  ESIndexPatternService,
  PackageService,
} from './services';
import { authenticateAgentWithAccessToken } from './services/agents/authenticate';
import { getAgentById, getAgentsByKuery } from './services/agents/crud';
import { getAgentStatusById, getAgentStatusForAgentPolicy } from './services/agents/status';
import { agentPolicyService } from './services/agent_policy';
import { appContextService } from './services/app_context';
import { FleetArtifactsClient } from './services/artifacts/client';
import { getInstallation } from './services/epm/packages/get';
import { ESIndexPatternSavedObjectService } from './services/es_index_pattern';
import { startFleetServerSetup } from './services/fleet_server';
import { licenseService } from './services/license';
import { packagePolicyService } from './services/package_policy';
import type { ExternalCallback } from './types/extensions';

export interface FleetSetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  features?: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface FleetStartDeps {
  data: DataPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security?: SecurityPluginStart;
}

export interface FleetAppContext {
  elasticsearch: ElasticsearchServiceStart;
  data: DataPluginStart;
  encryptedSavedObjectsStart?: EncryptedSavedObjectsPluginStart;
  encryptedSavedObjectsSetup?: EncryptedSavedObjectsPluginSetup;
  security?: SecurityPluginStart;
  config$?: Observable<FleetConfigType>;
  configInitialValue: FleetConfigType;
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
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
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
  implements AsyncPlugin<FleetSetupContract, FleetStartContract, FleetSetupDeps, FleetStartDeps> {
  private licensing$!: Observable<ILicense>;
  private config$: Observable<FleetConfigType>;
  private configInitialValue: FleetConfigType;
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
    this.configInitialValue = this.initializerContext.config.get();
  }

  public setup(core: CoreSetup, deps: FleetSetupDeps) {
    this.httpSetup = core.http;
    this.licensing$ = deps.licensing.license$;
    this.encryptedSavedObjectsSetup = deps.encryptedSavedObjects;
    this.cloud = deps.cloud;
    const config = this.configInitialValue;

    registerSavedObjects(core.savedObjects, deps.encryptedSavedObjects);
    registerEncryptedSavedObjects(deps.encryptedSavedObjects);

    // Register feature
    // TODO: Flesh out privileges
    if (deps.features) {
      deps.features.registerKibanaFeature({
        id: PLUGIN_ID,
        name: 'Fleet and Integrations',
        category: DEFAULT_APP_CATEGORIES.management,
        app: [PLUGIN_ID, INTEGRATIONS_PLUGIN_ID, 'kibana'],
        catalogue: ['fleet'],
        privileges: {
          all: {
            api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-all`],
            app: [PLUGIN_ID, INTEGRATIONS_PLUGIN_ID, 'kibana'],
            catalogue: ['fleet'],
            savedObject: {
              all: allSavedObjectTypes,
              read: [],
            },
            ui: ['show', 'read', 'write'],
          },
          read: {
            api: [`${PLUGIN_ID}-read`],
            app: [PLUGIN_ID, INTEGRATIONS_PLUGIN_ID, 'kibana'],
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
      registerPreconfigurationRoutes(routerSuperuserOnly);

      // Conditional config routes
      if (config.agents.enabled) {
        registerAgentAPIRoutes(routerSuperuserOnly, config);
        registerEnrollmentApiKeyRoutes(routerSuperuserOnly);
      }
    }
  }

  public start(core: CoreStart, plugins: FleetStartDeps): FleetStartContract {
    appContextService.start({
      elasticsearch: core.elasticsearch,
      data: plugins.data,
      encryptedSavedObjectsStart: plugins.encryptedSavedObjects,
      encryptedSavedObjectsSetup: this.encryptedSavedObjectsSetup,
      security: plugins.security,
      configInitialValue: this.configInitialValue,
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

    const fleetServerSetup = startFleetServerSetup();

    return {
      fleetSetupCompleted: () =>
        new Promise<void>((resolve) => {
          Promise.all([fleetServerSetup]).finally(() => resolve());
        }),
      esIndexPatternService: new ESIndexPatternSavedObjectService(),
      packageService: {
        getInstallation,
      },
      agentService: {
        getAgent: getAgentById,
        listAgents: getAgentsByKuery,
        getAgentStatusById,
        getAgentStatusForAgentPolicy,
        authenticateAgentWithAccessToken,
      },
      agentPolicyService: {
        get: agentPolicyService.get,
        list: agentPolicyService.list,
        getDefaultAgentPolicyId: agentPolicyService.getDefaultAgentPolicyId,
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
  }
}
