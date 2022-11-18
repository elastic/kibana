/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME } from '../common/constants';
import {
  IThreatIntelligencePlugin,
  ThreatIntelligencePluginCoreSetupDependencies,
  ThreatIntelligencePluginSetupDependencies,
} from './types';
import { threatIntelligenceSearchStrategyProvider } from './search_strategy';
import { Indicator } from '../common/types/indicator';
import { shouldClauseForThreat } from './scan';

const paramsSchema = schema.object({
  threatId: schema.string(),
});

export class ThreatIntelligencePlugin implements IThreatIntelligencePlugin {
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    core: ThreatIntelligencePluginCoreSetupDependencies,
    plugins: ThreatIntelligencePluginSetupDependencies
  ) {
    this.logger.debug('setup');

    const router = core.http.createRouter();

    const ROUTE_PATH = '/api/threat_intelligence/{threatId}/match';

    /**
     * Execute lazy matching to retrieve events in the user environment that match the IOC entry
     */
    router.get<{ threatId: string }, unknown, unknown>(
      {
        path: ROUTE_PATH,
        validate: {
          params: paramsSchema,
        },
      },
      async (context, request, response) => {
        const [{ elasticsearch }] = await core.getStartServices();

        const {
          params: { threatId },
        } = request;

        const esClient = elasticsearch.client.asScoped(request);

        const {
          hits: { hits: threats, total: threatsCount },
        } = await esClient.asCurrentUser.search<Indicator>({
          query: { ids: { values: threatId } },
          size: 1,
          rest_total_hits_as_int: true,
        });

        this.logger.info(`lazy matching threat id=${threatId}`);

        if (!threatsCount) {
          return response.notFound({ body: 'threat not found' });
        }

        const matchClauses = shouldClauseForThreat((threats[0] as any)._source);

        const lazyMatchesQuery = {
          bool: {
            should: matchClauses,
          },
        };

        const {
          hits: { hits: events },
        } = await esClient.asCurrentUser.search({
          query: lazyMatchesQuery,
          size: 1000,
        });

        return response.ok({
          body: {
            query: lazyMatchesQuery,
            events,
          },
        });
      }
    );

    core.getStartServices().then(([_, { data: dataStartService }]) => {
      const threatIntelligenceSearchStrategy =
        threatIntelligenceSearchStrategyProvider(dataStartService);

      plugins.data.search.registerSearchStrategy(
        THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME,
        threatIntelligenceSearchStrategy
      );

      this.logger.debug(`search strategy "${THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME}" registered`);
    });

    return {};
  }

  start() {
    this.logger.debug('start');

    return {};
  }

  stop() {
    this.logger.debug('stop');
  }
}
