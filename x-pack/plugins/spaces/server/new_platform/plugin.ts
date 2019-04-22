/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';
import { createDefaultSpace } from '../lib/create_default_space';
import { SpacesCoreSetup, SpacesInitializerContext, SpacesConfig } from '../../index';
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
import { initSpacesRequestInterceptors } from '../lib/request_inteceptors';
import { getSpacesUsageCollector } from '../lib/get_spaces_usage_collector';
import { SpacesService } from './spaces_service';

export class Plugin {
  private readonly pluginId = 'spaces';

  private config: SpacesConfig;

  private log: Logger;

  constructor(initializerContext: SpacesInitializerContext) {
    this.config = initializerContext.legacyConfig;
    this.log = initializerContext.logger.get('spaces');
  }

  public async setup(core: SpacesCoreSetup) {
    const xpackMainPlugin: XPackMainPlugin = core.xpackMain;
    watchStatusAndLicenseToInitialize(xpackMainPlugin, core.spaces, async () => {
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
      security: core.security,
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

    initSpacesRequestInterceptors({
      config: this.config,
      http: core.http,
      log: this.log,
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
    };
  }
}
