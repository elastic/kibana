/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
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
import { SecurityPluginSetup } from '../../security/server';
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
  registerAgentRoutes,
  registerEnrollmentApiKeyRoutes,
  registerInstallScriptRoutes,
  registerOutputRoutes,
  registerSettingsRoutes,
  registerAppRoutes,
} from './routes';
import { EsAssetReference, IngestManagerConfigType, NewPackagePolicy } from '../common';
import {
  appContextService,
  licenseService,
  ESIndexPatternSavedObjectService,
  ESIndexPatternService,
  AgentService,
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
import { registerIngestManagerUsageCollector } from './collectors/register';
import { getInstallation } from './services/epm/packages';

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  features?: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

export type IngestManagerStartDeps = object;

export interface IngestManagerAppContext {
  encryptedSavedObjectsStart: EncryptedSavedObjectsPluginStart;
  encryptedSavedObjectsSetup?: EncryptedSavedObjectsPluginSetup;
  security?: SecurityPluginSetup;
  config$?: Observable<IngestManagerConfigType>;
  savedObjects: SavedObjectsServiceStart;
  isProductionMode: PluginInitializerContext['env']['mode']['prod'];
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  kibanaBranch: PluginInitializerContext['env']['packageInfo']['branch'];
  cloud?: CloudSetup;
  logger?: Logger;
  httpSetup?: HttpServiceSetup;
}

export type IngestManagerSetupContract = void;

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
 * Callbacks supported by the Ingest plugin
 */
export type ExternalCallback = [
  'packagePolicyCreate',
  (
    newPackagePolicy: NewPackagePolicy,
    context: RequestHandlerContext,
    request: KibanaRequest
  ) => Promise<NewPackagePolicy>
];

export type ExternalCallbacksStorage = Map<ExternalCallback[0], Set<ExternalCallback[1]>>;

/**
 * Describes public IngestManager plugin contract returned at the `startup` stage.
 */
export interface IngestManagerStartContract {
  esIndexPatternService: ESIndexPatternService;
  packageService: PackageService;
  agentService: AgentService;
  /**
   * Services for Ingest's package policies
   */
  packagePolicyService: typeof packagePolicyService;
  /**
   * Register callbacks for inclusion in ingest API processing
   * @param args
   */
  registerExternalCallback: (...args: ExternalCallback) => void;
}

export class IngestManagerPlugin
  implements
    Plugin<
      IngestManagerSetupContract,
      IngestManagerStartContract,
      IngestManagerSetupDeps,
      IngestManagerStartDeps
    > {
  private licensing$!: Observable<ILicense>;
  private config$: Observable<IngestManagerConfigType>;
  private security: SecurityPluginSetup | undefined;
  private cloud: CloudSetup | undefined;
  private logger: Logger | undefined;

  private isProductionMode: IngestManagerAppContext['isProductionMode'];
  private kibanaVersion: IngestManagerAppContext['kibanaVersion'];
  private kibanaBranch: IngestManagerAppContext['kibanaBranch'];
  private httpSetup: HttpServiceSetup | undefined;
  private encryptedSavedObjectsSetup: EncryptedSavedObjectsPluginSetup | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config$ = this.initializerContext.config.create<IngestManagerConfigType>();
    this.isProductionMode = this.initializerContext.env.mode.prod;
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
    this.kibanaBranch = this.initializerContext.env.packageInfo.branch;
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, deps: IngestManagerSetupDeps) {
    this.httpSetup = core.http;
    this.licensing$ = deps.licensing.license$;
    if (deps.security) {
      this.security = deps.security;
    }
    this.encryptedSavedObjectsSetup = deps.encryptedSavedObjects;
    this.cloud = deps.cloud;

    registerSavedObjects(core.savedObjects, deps.encryptedSavedObjects);
    registerEncryptedSavedObjects(deps.encryptedSavedObjects);

    // Register feature
    // TODO: Flesh out privileges
    if (deps.features) {
      deps.features.registerKibanaFeature({
        id: PLUGIN_ID,
        name: 'Ingest Manager',
        category: DEFAULT_APP_CATEGORIES.management,
        app: [PLUGIN_ID, 'kibana'],
        catalogue: ['ingestManager'],
        privileges: {
          all: {
            api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-all`],
            app: [PLUGIN_ID, 'kibana'],
            catalogue: ['ingestManager'],
            savedObject: {
              all: allSavedObjectTypes,
              read: [],
            },
            ui: ['show', 'read', 'write'],
          },
          read: {
            api: [`${PLUGIN_ID}-read`],
            app: [PLUGIN_ID, 'kibana'],
            catalogue: ['ingestManager'], // TODO: check if this is actually available to read user
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
    registerIngestManagerUsageCollector(core, config, deps.usageCollection);

    // Always register app routes for permissions checking
    registerAppRoutes(router);

    // Register rest of routes only if security is enabled
    if (this.security) {
      registerSetupRoutes(router, config);
      registerAgentPolicyRoutes(router);
      registerPackagePolicyRoutes(router);
      registerOutputRoutes(router);
      registerSettingsRoutes(router);
      registerDataStreamRoutes(router);
      registerEPMRoutes(router);

      // Conditional config routes
      if (config.agents.enabled) {
        const isESOUsingEphemeralEncryptionKey =
          deps.encryptedSavedObjects.usingEphemeralEncryptionKey;
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
          registerAgentRoutes(router, config);
          registerEnrollmentApiKeyRoutes(router);
          registerInstallScriptRoutes({
            router,
            basePath: core.http.basePath,
          });
        }
      }
    }
  }

  public async start(
    core: CoreStart,
    plugins: {
      encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
    }
  ): Promise<IngestManagerStartContract> {
    await appContextService.start({
      encryptedSavedObjectsStart: plugins.encryptedSavedObjects,
      encryptedSavedObjectsSetup: this.encryptedSavedObjectsSetup,
      security: this.security,
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
      packagePolicyService,
      registerExternalCallback: (...args: ExternalCallback) => {
        return appContextService.addExternalCallback(...args);
      },
    };
  }

  public async stop() {
    appContextService.stop();
    licenseService.stop();
    agentCheckinState.stop();
  }
}
