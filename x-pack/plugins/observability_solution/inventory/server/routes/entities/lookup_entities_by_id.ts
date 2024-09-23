/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLSearchResponse } from '@kbn/es-types';
import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { groupBy } from 'lodash';
import { searchLatestEntitiesIndex } from './search_latest_entities_index';

export async function lookupEntitiesById({
  esClient,
  entities,
  start,
  end,
}: {
  esClient: ObservabilityElasticsearchClient;
  entities: Array<{ type: string; displayName: string }>;
  start: number;
  end: number;
}): Promise<ESQLSearchResponse> {
  if (!entities.length) {
    return {
      columns: [],
      values: [],
    };
  }

  const byType = groupBy(entities, (entity) => entity.type);

  return searchLatestEntitiesIndex({
    esClient,
    start,
    end,
    dslFilter: [
      {
        bool: {
          should: Object.entries(byType).map(([type, entitiesForType]) => {
            return {
              bool: {
                filter: [
                  {
                    term: {
                      'entity.type': type,
                    },
                  },
                  {
                    terms: {
                      'entity.displayName.keyword': entitiesForType.map(
                        (entity) => entity.displayName
                      ),
                    },
                  },
                ],
              },
            };
          }),
        },
      },
    ],
  });
}
