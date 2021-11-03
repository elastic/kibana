/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type {
  CoreSetup,
  CoreStart,
  ElasticsearchServiceStart,
  Logger,
  AsyncPlugin,
  PluginInitializerContext,
  SavedObjectsServiceStart,
  HttpServiceSetup,
} from 'kibana/server';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import type { PluginStart as DataPluginStart } from '../../../../src/plugins/data/server';
import type { LicensingPluginSetup, ILicense } from '../../licensing/server';
import type {
  EncryptedSavedObjectsPluginStart,
  EncryptedSavedObjectsPluginSetup,
} from '../../encrypted_saved_objects/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '../../security/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import type { FleetConfigType } from '../common';
import { INTEGRATIONS_PLUGIN_ID } from '../common';
import type { CloudSetup } from '../../cloud/server';

import {
  PLUGIN_ID,
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  ASSETS_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
} from './constants';
import { registerSavedObjects, registerEncryptedSavedObjects } from './saved_objects';
import {
  registerEPMRoutes,
  registerPackagePolicyRoutes,
  registerDataStreamRoutes,
  registerAgentPolicyRoutes,
  registerSetupRoutes,
  registerAgentAPIRoutes,
  registerEnrollmentApiKeyRoutes,
  registerOutputRoutes,
  registerSettingsRoutes,
  registerAppRoutes,
  registerPreconfigurationRoutes,
} from './routes';

import type { ExternalCallback, FleetRequestHandlerContext } from './types';
import type {
  ESIndexPatternService,
  AgentService,
  AgentPolicyServiceInterface,
  PackageService,
} from './services';
import {
  appContextService,
  licenseService,
  ESIndexPatternSavedObjectService,
  agentPolicyService,
  packagePolicyService,
} from './services';
import {
  getAgentStatusById,
  getAgentStatusForAgentPolicy,
  authenticateAgentWithAccessToken,
  getAgentsByKuery,
  getAgentById,
} from './services/agents';
import { registerFleetUsageCollector } from './collectors/register';
import { getInstallation, ensureInstalledPackage } from './services/epm/packages';
import { RouterWrappers } from './routes/security';
import { startFleetServerSetup } from './services/fleet_server';
import { FleetArtifactsClient } from './services/artifacts';
import type { FleetRouter } from './types/request_context';

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
  securitySetup?: SecurityPluginSetup;
  securityStart?: SecurityPluginStart;
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
  ASSETS_SAVED_OBJECT_TYPE,
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
  implements AsyncPlugin<FleetSetupContract, FleetStartContract, FleetSetupDeps, FleetStartDeps>
{
  private licensing$!: Observable<ILicense>;
  private config$: Observable<FleetConfigType>;
  private configInitialValue: FleetConfigType;
  private cloud?: CloudSetup;
  private logger?: Logger;

  private isProductionMode: FleetAppContext['isProductionMode'];
  private kibanaVersion: FleetAppContext['kibanaVersion'];
  private kibanaBranch: FleetAppContext['kibanaBranch'];
  private httpSetup?: HttpServiceSetup;
  private securitySetup?: SecurityPluginSetup;
  private encryptedSavedObjectsSetup?: EncryptedSavedObjectsPluginSetup;

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
    this.securitySetup = deps.security;
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

    core.http.registerRouteHandlerContext<FleetRequestHandlerContext, 'fleet'>(
      'fleet',
      (coreContext, request) => ({
        epm: {
          // Use a lazy getter to avoid constructing this client when not used by a request handler
          get internalSoClient() {
            return appContextService
              .getSavedObjects()
              .getScopedClient(request, { excludedWrappers: ['security'] });
          },
        },
      })
    );

    const router: FleetRouter = core.http.createRouter<FleetRequestHandlerContext>();

    // Register usage collection
    registerFleetUsageCollector(core, config, deps.usageCollection);

    // Always register app routes for permissions checking
    registerAppRoutes(router);
    // Allow read-only users access to endpoints necessary for Integrations UI
    // Only some endpoints require superuser so we pass a raw IRouter here

    // For all the routes we enforce the user to have role superuser
    const superuserRouter = RouterWrappers.require.superuser(router);
    const fleetSetupRouter = RouterWrappers.require.fleetSetupPrivilege(router);

    // Some EPM routes use regular rbac to support integrations app
    registerEPMRoutes({ rbac: router, superuser: superuserRouter });

    // Register rest of routes only if security is enabled
    if (deps.security) {
      registerSetupRoutes(fleetSetupRouter, config);
      registerAgentPolicyRoutes({
        fleetSetup: fleetSetupRouter,
        superuser: superuserRouter,
      });
      registerPackagePolicyRoutes(superuserRouter);
      registerOutputRoutes(superuserRouter);
      registerSettingsRoutes(superuserRouter);
      registerDataStreamRoutes(superuserRouter);
      registerPreconfigurationRoutes(superuserRouter);

      // Conditional config routes
      if (config.agents.enabled) {
        registerAgentAPIRoutes(superuserRouter, config);
        registerEnrollmentApiKeyRoutes({
          fleetSetup: fleetSetupRouter,
          superuser: superuserRouter,
        });
      }
    }
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
        ensureInstalledPackage,
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
