/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { PluginInitializerContext } from 'kibana/server';
import { CspAppContextService, CspAppContext } from './lib/csp_app_context_services';
import type {
  // PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  IRouter,
  RequestHandlerContext,
} from '../../../../src/core/server';
import { createFindingsIndexTemplate } from './index_template/create_index_template';
import type {
  CspServerPluginSetup,
  CspServerPluginStart,
  CspServerPluginSetupDeps,
  CspServerPluginStartDeps,
} from './types';
import { defineRoutes } from './routes';

export const ConfigSchema = schema.object({
  actionEnabled: schema.boolean({ defaultValue: false }),
  savedQueries: schema.boolean({ defaultValue: true }),
  packs: schema.boolean({ defaultValue: true }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
interface HandlerContext extends RequestHandlerContext, CspServerPluginStartDeps {}

// import { ConfigType } from './config';

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
  private readonly CspAppContextService = new CspAppContextService();

  public setup(
    core: CoreSetup<CspServerPluginSetup>,
    plugins: CspServerPluginSetupDeps
  ): CspServerPluginSetup {
    this.logger.debug('csp: Setup');
    // const config = createConfig(this.initializerContext);
    const cspContext: CspAppContext = {
      // logFactory: this.context.logger,
      // config: (): ConfigType => config,
      getStartServices: core.getStartServices,
      service: this.CspAppContextService,
      // security: plugins.security,
    };
    cspContext.service.getPackagePolicyService();
    const router = core.http.createRouter();

    defineRoutes(router, cspContext);

    return {};
  }

  public start(core: CoreStart, plugins: CspServerPluginStartDeps): CspServerPluginStart {
    this.logger.debug('csp: Started');
    const registerIngestCallback = plugins.fleet?.registerExternalCallback;
    this.CspAppContextService.start({
      ...plugins.fleet,
      // @ts-expect-error update types
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      config: this.config!,
      logger: this.logger,
      registerIngestCallback,
    });
    // if (plugins.fleet) {
    //   const registerIngestCallback = plugins.fleet?.registerExternalCallback;
    //   plugins.fleet.createArtifactsClient('csp');
    // }
    createFindingsIndexTemplate(core.elasticsearch.client.asInternalUser).catch(this.logger.error);

    return {};
  }
  public stop() {}
}
