/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import pLimit from 'p-limit';
import { Logger } from '@kbn/logging';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { InventoryEntityDefinition } from '../../../common/entities';
import { getEntitiesFromSource } from './get_entities_from_source';
import { lookupEntitiesById } from './lookup_entities_by_id';
import { searchLatestEntitiesIndex } from './search_latest_entities_index';
import { esqlResponseToEntities } from '../../../common/utils/esql_response_to_entities';

export async function getLatestEntities({
  esClient,
  kuery,
  start,
  end,
  fromSourceIfEmpty,
  typeDefinitions,
  logger,
  dslFilter,
}: {
  esClient: ObservabilityElasticsearchClient;
  kuery: string;
  start: number;
  end: number;
  fromSourceIfEmpty?: boolean;
  typeDefinitions?: InventoryEntityDefinition[];
  logger: Logger;
  dslFilter?: QueryDslQueryContainer[];
}) {
  const response = await searchLatestEntitiesIndex({
    esClient,
    start,
    end,
    kuery,
    dslFilter: [
      ...(dslFilter ?? []),
      ...(typeDefinitions?.length
        ? [
            {
              terms: {
                'entity.type': typeDefinitions.map((definition) => definition.type),
              },
            },
          ]
        : []),
    ],
  });

  if (response.values.length || !fromSourceIfEmpty || !typeDefinitions?.length) {
    return esqlResponseToEntities(response);
  }

  const limiter = pLimit(10);

  const entitiesFromSourceResults = await Promise.all(
    typeDefinitions.map((definition) => {
      return limiter(() => {
        return getEntitiesFromSource({
          esClient,
          start,
          end,
          kuery,
          indexPatterns: definition.sources.flatMap((source) => source.indexPatterns),
          definition,
          logger,
          dslFilter,
        });
      });
    })
  );

  return esqlResponseToEntities(
    await lookupEntitiesById({
      esClient,
      start,
      end,
      entities: entitiesFromSourceResults.flat(),
    })
  );
}
