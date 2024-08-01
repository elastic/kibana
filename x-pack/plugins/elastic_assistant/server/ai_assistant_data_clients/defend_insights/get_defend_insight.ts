/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import { DefendInsightsResponse } from '@kbn/elastic-assistant-common';

import { EsDefendInsightSchema } from './types';
import { transformESSearchToDefendInsights } from './helpers';

export interface GetDefendInsightParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  index: string;
  id: string;
  user: AuthenticatedUser;
}

export const getDefendInsight = async ({
  esClient,
  logger,
  index,
  id,
  user,
}: GetDefendInsightParams): Promise<DefendInsightsResponse | null> => {
  try {
    const response = await esClient.search<EsDefendInsightSchema>({
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    term: {
                      _id: id,
                    },
                  },
                ],
                must: [
                  {
                    match: user.profile_uid
                      ? { 'users.id': user.profile_uid }
                      : { 'users.name': user.username },
                  },
                ],
              },
            },
          ],
        },
      },
      _source: true,
      ignore_unavailable: true,
      index,
      seq_no_primary_term: true,
    });
    const insights = transformESSearchToDefendInsights(response);
    return insights[0] ?? null;
  } catch (err) {
    logger.error(`Error fetching Defend insight: ${err} with id: ${id}`);
    throw err;
  }
};
