/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { PluginInitializerContext } from 'kibana/server';
import { CspAppContextService, CspAppContext } from './lib/csp_app_context_services';
import type { CoreSetup, CoreStart, Plugin, Logger } from '../../../../src/core/server';
import { createFindingsIndexTemplate } from './index_template/create_index_template';
import type {
  CspServerPluginSetup,
  CspServerPluginStart,
  CspServerPluginSetupDeps,
  CspServerPluginStartDeps,
} from './types';
import { defineRoutes } from './routes';
import { initUiSettings } from './uiSettings';

export const ConfigSchema = schema.object({
  actionEnabled: schema.boolean({ defaultValue: false }),
  savedQueries: schema.boolean({ defaultValue: true }),
  packs: schema.boolean({ defaultValue: true }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;

export const createConfig = (context: PluginInitializerContext): Readonly<ConfigType> =>
  context.config.get<ConfigType>();

export class CspPlugin
  implements
    Plugin<
      CspServerPluginSetup,
      CspServerPluginStart,
      CspServerPluginSetupDeps,
      CspServerPluginStartDeps
    >
{
  private readonly logger: Logger;
  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }
  private readonly CspAppService = new CspAppContextService();

  public setup(
    core: CoreSetup<CspServerPluginStartDeps, CspServerPluginStart>,
    plugins: CspServerPluginSetupDeps
  ): CspServerPluginSetup {
    this.logger.debug('csp: Setup');

    const cspContext: CspAppContext = {
      logger: this.logger,
      service: this.CspAppService,
      getStartServices: core.getStartServices,
    };

    cspContext.service.getPackagePolicyService();

    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, cspContext);
    initUiSettings(core.uiSettings);

    return {};
  }

  public start(core: CoreStart, plugins: CspServerPluginStartDeps): CspServerPluginStart {
    this.logger.debug('csp: Started');
    const registerIngestCallback = plugins.fleet?.registerExternalCallback;
    this.CspAppService.start({
      // fleet: plugins.fleet,
      ...plugins.fleet,
      logger: this.logger,
      registerIngestCallback,
    });

    createFindingsIndexTemplate(core.elasticsearch.client.asInternalUser, this.logger).catch(
      this.logger.error
    );
    return {};
  }
  public stop() {}
}
