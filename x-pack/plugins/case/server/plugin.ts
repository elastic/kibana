/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map, mergeMap } from 'rxjs/operators';
import {
  APICaller,
  CoreSetup,
  CoreStart,
  Logger,
  PluginInitializerContext,
  PluginName,
  SavedObjectsLegacyService,
} from 'kibana/server';
import Boom from 'boom';
import { ConfigType } from './config';
import { initCaseApi } from './routes/api';

/**
 * Describes a set of APIs that is available in the legacy platform only and required by this plugin
 * to function properly.
 */
export interface LegacyAPI {
  savedObjects: SavedObjectsLegacyService;
}

function createConfig$(context: PluginInitializerContext) {
  return context.config.create<ConfigType>().pipe(map(config => config));
}

interface SpacesAggregationResponse {
  hits: {
    total: { value: number };
  };
  aggregations: {
    [aggName: string]: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
  };
}
const throwAnError = (error: any) => {
  if (error.isBoom) {
    return error;
  }

  const statusCode = error.statusCode;
  const message = error.body ? error.body.error : undefined;
  return Boom.boomify(error, { statusCode, message });
};

async function callApiPlease(callCluster: APICaller, indices: string[] | string) {
  try {
    return await callCluster<SpacesAggregationResponse>('search', {
      index: indices,
      body: {
        track_total_hits: true,
        query: {
          term: {
            state: {
              value: 'open',
            },
          },
        },
      },
    });
  } catch (error) {
    throw throwAnError(error);
  }
}

export class CasePlugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, deps: Record<PluginName, unknown>) {
    const config = await createConfig$(this.initializerContext)
      .pipe(first())
      .toPromise();

    this.log.debug(
      `Setting up Case Workflow with core contract [${Object.keys(core)}] and deps [${Object.keys(
        deps
      )}]`
    );
    if (!config.enabled) {
      return {};
    }

    const router = core.http.createRouter();
    initCaseApi({
      caseIndex: config.indexPattern,
      http: core.http,
      log: this.log,
      router,
    });

    router.get({ path: '/case/elasticsearch', validate: false }, async (context, req, res) => {
      const requestClient = context.core.elasticsearch.dataClient;
      const response = await callApiPlease(requestClient.callAsCurrentUser, config.indexPattern);

      console.log('HEY NOW!!', response);
      return res.ok({ body: response });
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
