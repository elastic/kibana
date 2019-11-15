/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, mergeMap } from 'rxjs/operators';
import { CoreSetup, CoreStart, Logger, PluginInitializerContext, PluginName } from 'kibana/server';
import { ConfigType } from './config';
import { initCaseApi } from './routes/api';

export class CasePlugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup, deps: Record<PluginName, unknown>) {
    this.log.debug(
      `Setting up Case Workflow with core contract [${Object.keys(core)}] and deps [${Object.keys(
        deps
      )}]`
    );

    const router = core.http.createRouter();

    /* BOILERPLATE ABOVE HERE */
    initCaseApi({
      router,
      log: this.log,
    });
    /* BOILERPLATE BELOW HERE */
    router.get({ path: '/case/elasticsearch', validate: false }, async (context, req, res) => {
      const response = await context.core.elasticsearch.adminClient.callAsInternalUser('ping');
      return res.ok({ body: `Elasticsearch: ${response}` });
    });

    router.get({ path: '/case/savedobjectsclient', validate: false }, async (context, req, res) => {
      const response = await context.core.savedObjects.client.find({ type: 'TYPE' });
      return res.ok({ body: `SavedObjects client: ${JSON.stringify(response)}` });
    });

    return {
      data$: this.initializerContext.config.create<ConfigType>().pipe(
        map(configValue => {
          this.log.debug(`I've got value from my config: ${configValue.secret}`);
          return `Some exposed data derived from config: ${configValue.secret}`;
        })
      ),
      pingElasticsearch$: core.elasticsearch.adminClient$.pipe(
        mergeMap(client => client.callAsInternalUser('ping'))
      ),
    };
  }

  public start(core: CoreStart, deps: Record<PluginName, unknown>) {
    this.log.debug(
      `Starting up Case Workflow with core contract [${Object.keys(core)}] and deps [${Object.keys(
        deps
      )}]`
    );

    return {
      getStartContext() {
        return core;
      },
    };
  }

  public stop() {
    this.log.debug(`Stopping Case Workflow`);
  }
}
