/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Logger,
  HttpServiceSetup,
  PluginInitializerContext,
  ElasticsearchServiceSetup,
} from 'src/core/server';
import { KibanaConfig, SavedObjectsService } from 'src/legacy/server/kbn_server';
import { ServerRoute } from 'hapi';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';
import { createDefaultSpace } from '../lib/create_default_space';
// @ts-ignore
import { AuditLogger } from '../../../../server/lib/audit_logger';
// @ts-ignore
import { watchStatusAndLicenseToInitialize } from '../../../../server/lib/watch_status_and_license_to_initialize';
import { checkLicense } from '../lib/check_license';
import { spacesSavedObjectsClientWrapperFactory } from '../lib/saved_objects_client/saved_objects_client_wrapper_factory';
import { SpacesAuditLogger } from '../lib/audit_logger';
import { createSpacesTutorialContextFactory } from '../lib/spaces_tutorial_context_factory';
import { initPrivateApis } from '../routes/api/v1';
import { initPublicSpacesApi } from '../routes/api/public';
import { getSpacesUsageCollector } from '../lib/get_spaces_usage_collector';
import { SpacesService } from './spaces_service';
import { SecurityPlugin } from '../../../security';
import { SpacesServiceSetup } from './spaces_service/spaces_service';

export interface SpacesHttpServiceSetup extends HttpServiceSetup {
  route(route: ServerRoute | ServerRoute[]): void;
}
export interface SpacesCoreSetup {
  http: SpacesHttpServiceSetup;
  savedObjects: SavedObjectsService;
  elasticsearch: ElasticsearchServiceSetup;
  usage: {
    collectorSet: {
      register: (collector: any) => void;
    };
  };
  tutorial: {
    addScopedTutorialContextFactory: (factory: any) => void;
  };
}

export interface PluginsSetup {
  getSecurity: () => SecurityPlugin;
  xpackMain: XPackMainPlugin;
  // TODO: this is temporary for `watchLicenseAndStatusToInitialize`
  spaces: any;
}

export interface SpacesPluginSetup {
  spacesService: SpacesServiceSetup;
  // TODO: this is temporary, required by request interceptors which are initialized in legacy plugin
  log: Logger;
}

export interface SpacesInitializerContext extends PluginInitializerContext {
  legacyConfig: KibanaConfig;
}
export class Plugin {
  private readonly pluginId = 'spaces';

  private config: KibanaConfig;

  private log: Logger;

  constructor(initializerContext: SpacesInitializerContext) {
    this.config = initializerContext.legacyConfig;
    this.log = initializerContext.logger.get('spaces');
  }

  public async setup(core: SpacesCoreSetup, plugins: PluginsSetup): Promise<SpacesPluginSetup> {
    const xpackMainPlugin: XPackMainPlugin = plugins.xpackMain;
    watchStatusAndLicenseToInitialize(xpackMainPlugin, plugins.spaces, async () => {
      await createDefaultSpace({
        elasticsearch: core.elasticsearch,
        savedObjects: core.savedObjects,
      });
    });

    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin.
    xpackMainPlugin.info.feature(this.pluginId).registerLicenseCheckResultsGenerator(checkLicense);

    const spacesAuditLogger = new SpacesAuditLogger(
      this.config,
      new AuditLogger(core.http.server, 'spaces')
    );

    const service = new SpacesService(this.log, this.config);
    const spacesService = await service.setup({
      elasticsearch: core.elasticsearch,
      savedObjects: core.savedObjects,
      getSecurity: plugins.getSecurity,
      spacesAuditLogger,
    });

    const { addScopedSavedObjectsClientWrapperFactory, types } = core.savedObjects;
    addScopedSavedObjectsClientWrapperFactory(
      Number.MAX_VALUE,
      spacesSavedObjectsClientWrapperFactory(spacesService, types)
    );

    core.tutorial.addScopedTutorialContextFactory(
      createSpacesTutorialContextFactory(spacesService)
    );

    initPrivateApis({
      http: core.http,
      config: this.config,
      savedObjects: core.savedObjects,
      spacesService,
      xpackMain: xpackMainPlugin,
    });

    initPublicSpacesApi({
      http: core.http,
      log: this.log,
      savedObjects: core.savedObjects,
      spacesService,
      xpackMain: xpackMainPlugin,
    });

    // Register a function with server to manage the collection of usage stats
    core.usage.collectorSet.register(
      getSpacesUsageCollector({
        config: this.config,
        savedObjects: core.savedObjects,
        usage: core.usage,
        xpackMain: xpackMainPlugin,
      })
    );

    return {
      spacesService,
      log: this.log,
    };
  }
}
