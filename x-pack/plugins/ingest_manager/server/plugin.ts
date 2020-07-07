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
} from 'kibana/server';
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
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  PACKAGE_CONFIG_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
} from './constants';
import { registerSavedObjects, registerEncryptedSavedObjects } from './saved_objects';
import {
  registerEPMRoutes,
  registerPackageConfigRoutes,
  registerDataStreamRoutes,
  registerAgentConfigRoutes,
  registerSetupRoutes,
  registerAgentRoutes,
  registerEnrollmentApiKeyRoutes,
  registerInstallScriptRoutes,
  registerOutputRoutes,
  registerSettingsRoutes,
  registerAppRoutes,
} from './routes';
import { IngestManagerConfigType, NewPackageConfig } from '../common';
import {
  appContextService,
  licenseService,
  ESIndexPatternSavedObjectService,
  ESIndexPatternService,
  AgentService,
  packageConfigService,
} from './services';
import {
  getAgentStatusById,
  authenticateAgentWithAccessToken,
  listAgents,
  getAgent,
} from './services/agents';
import { CloudSetup } from '../../cloud/server';
import { agentCheckinState } from './services/agents/checkin/state';

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
  features?: FeaturesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  cloud?: CloudSetup;
}

export type IngestManagerStartDeps = object;

export interface IngestManagerAppContext {
  encryptedSavedObjectsStart: EncryptedSavedObjectsPluginStart;
  encryptedSavedObjectsSetup?: EncryptedSavedObjectsPluginSetup;
  security?: SecurityPluginSetup;
  config$?: Observable<IngestManagerConfigType>;
  savedObjects: SavedObjectsServiceStart;
  isProductionMode: boolean;
  kibanaVersion: string;
  cloud?: CloudSetup;
  logger?: Logger;
  httpSetup?: HttpServiceSetup;
}

export type IngestManagerSetupContract = void;

const allSavedObjectTypes = [
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  PACKAGE_CONFIG_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
];

/**
 * Callbacks supported by the Ingest plugin
 */
export type ExternalCallback = [
  'packageConfigCreate',
  (newPackageConfig: NewPackageConfig) => Promise<NewPackageConfig>
];

export type ExternalCallbacksStorage = Map<ExternalCallback[0], Set<ExternalCallback[1]>>;

/**
 * Describes public IngestManager plugin contract returned at the `startup` stage.
 */
export interface IngestManagerStartContract {
  esIndexPatternService: ESIndexPatternService;
  agentService: AgentService;
  /**
   * Services for Ingest's package configs
   */
  packageConfigService: typeof packageConfigService;
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

  private isProductionMode: boolean;
  private kibanaVersion: string;
  private httpSetup: HttpServiceSetup | undefined;
  private encryptedSavedObjectsSetup: EncryptedSavedObjectsPluginSetup | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config$ = this.initializerContext.config.create<IngestManagerConfigType>();
    this.isProductionMode = this.initializerContext.env.mode.prod;
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
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

    registerSavedObjects(core.savedObjects);
    registerEncryptedSavedObjects(deps.encryptedSavedObjects);

    // Register feature
    // TODO: Flesh out privileges
    if (deps.features) {
      deps.features.registerFeature({
        id: PLUGIN_ID,
        name: 'Ingest Manager',
        icon: 'savedObjectsApp',
        navLinkId: PLUGIN_ID,
        app: [PLUGIN_ID, 'kibana'],
        privileges: {
          all: {
            api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-all`],
            app: [PLUGIN_ID, 'kibana'],
            savedObject: {
              all: allSavedObjectTypes,
              read: [],
            },
            ui: ['show', 'read', 'write'],
          },
          read: {
            api: [`${PLUGIN_ID}-read`],
            app: [PLUGIN_ID, 'kibana'],
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

    // Always register app routes for permissions checking
    registerAppRoutes(router);

    // Register rest of routes only if security is enabled
    if (this.security) {
      registerSetupRoutes(router, config);
      registerAgentConfigRoutes(router);
      registerPackageConfigRoutes(router);
      registerOutputRoutes(router);
      registerSettingsRoutes(router);
      registerDataStreamRoutes(router);

      // Conditional config routes
      if (config.epm.enabled) {
        registerEPMRoutes(router);
      }

      if (config.fleet.enabled) {
        const isESOUsingEphemeralEncryptionKey =
          deps.encryptedSavedObjects.usingEphemeralEncryptionKey;
        if (isESOUsingEphemeralEncryptionKey) {
          if (this.logger) {
            this.logger.warn(
              'Fleet APIs are disabled due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.'
            );
          }
        } else {
          registerAgentRoutes(router);
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
      httpSetup: this.httpSetup,
      cloud: this.cloud,
      logger: this.logger,
    });
    licenseService.start(this.licensing$);
    agentCheckinState.start();

    return {
      esIndexPatternService: new ESIndexPatternSavedObjectService(),
      agentService: {
        getAgent,
        listAgents,
        getAgentStatusById,
        authenticateAgentWithAccessToken,
      },
      packageConfigService,
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
