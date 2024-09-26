/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { groupBy } from 'lodash';
import { EntitySortField, EntityWithSignalCounts } from '../../../common/entities';
import { searchLatestEntitiesIndex } from './search_latest_entities_index';

export async function lookupEntitiesById({
  esClient,
  entities,
  start,
  end,
  signals,
  sortOrder,
  sortField,
  postFilter,
}: {
  esClient: ObservabilityElasticsearchClient;
  entities: Array<{ type: string; displayName: string }>;
  start: number;
  end: number;
  signals: Array<Pick<EntityWithSignalCounts, 'type' | 'displayName' | 'alerts' | 'slos'>>;
  sortOrder: 'asc' | 'desc';
  sortField: EntitySortField;
  postFilter?: string;
}): Promise<EntityWithSignalCounts[]> {
  if (!entities.length) {
    return [];
  }

  const byType = groupBy(entities, (entity) => entity.type);

  return searchLatestEntitiesIndex({
    esClient,
    start,
    end,
    signals,
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
    sortOrder,
    sortField,
  });
}
