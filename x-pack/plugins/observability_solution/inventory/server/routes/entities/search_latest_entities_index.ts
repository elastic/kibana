/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ESQLLookupTables } from '@kbn/es-types/src/search';
import { kqlQuery } from '@kbn/observability-plugin/server';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { isEmpty } from 'lodash';
import {
  EntitySortField,
  EntityWithSignalCounts,
  LATEST_ENTITIES_INDEX,
} from '../../../common/entities';
import { esqlResultToPlainObjects } from '../../../common/utils/esql_result_to_plain_objects';
import { getEsqlRequest } from '../../../common/utils/get_esql_request';
import { entityTimeRangeQuery } from '../../../common/utils/queries/entity_time_range_query';
import { toEntity } from '../../../common/utils/to_entity';

const MAX_NUMBER_OF_ENTITIES = 500;

const keyword = () => ({ keyword: [] as Array<string | null> });
const long = () => ({ long: [] as Array<number | null> });

export async function searchLatestEntitiesIndex({
  esClient,
  start,
  end,
  kuery,
  dslFilter,
  signals,
  sortOrder,
  sortField,
}: {
  esClient: ObservabilityElasticsearchClient;
  start: number;
  end: number;
  kuery?: string;
  dslFilter?: QueryDslQueryContainer[];
  signals: Array<Pick<EntityWithSignalCounts, 'type' | 'displayName' | 'slos' | 'alerts'>>;
  sortOrder: 'asc' | 'desc';
  sortField: EntitySortField;
}): Promise<EntityWithSignalCounts[]> {
  const tables: ESQLLookupTables = {};

  if (signals && signals.length) {
    tables.signal_count = signals.reduce(
      (prev, current) => {
        prev['entity.type'].keyword.push(current.type);
        prev['entity.displayName'].keyword.push(current.displayName);
        prev['slos.healthy'].long.push(current.slos.healthy || null);
        prev['slos.violated'].long.push(current.slos.violated || null);
        prev['slos.degraded'].long.push(current.slos.degraded || null);
        prev['slos.no_data'].long.push(current.slos.no_data || null);
        prev['alerts.active'].long.push(current.alerts.active || null);
        prev['alerts.total'].long.push(current.alerts.total || null);

        return prev;
      },
      {
        'entity.type': keyword(),
        'entity.displayName': keyword(),
        'slos.violated': long(),
        'slos.healthy': long(),
        'slos.degraded': long(),
        'slos.no_data': long(),
        'alerts.active': long(),
        'alerts.total': long(),
      }
    );
  }

  const commands = [`FROM ${LATEST_ENTITIES_INDEX}`];

  if (signals.length) {
    commands.push(`LOOKUP signal_count ON entity.type, entity.displayName`);
    commands.push('LIMIT 10000000');
  }

  const sortOrderUC = sortOrder.toUpperCase();

  if (sortField === 'alerts') {
    commands.push(`SORT alerts.active ${sortOrderUC} NULLS_LAST`);
  } else if (sortField === 'slos') {
    commands.push(
      `SORT slos.violated ${sortOrderUC} NULLS LAST, slos.degraded ${sortOrderUC} NULLS LAST, slos.no_data ${sortOrderUC} NULLS LAST, slos.healthy ${sortOrderUC} NULLS LAST`
    );
  } else {
    commands.push(`SORT \`${sortField}\` ${sortOrderUC}`);
  }

  commands.push(`LIMIT ${MAX_NUMBER_OF_ENTITIES}`);

  const request = {
    ...getEsqlRequest({
      query: commands.join(' | '),
      dslFilter: [...(dslFilter ?? []), ...kqlQuery(kuery), ...entityTimeRangeQuery(start, end)],
    }),
    tables: !isEmpty(tables) ? tables : undefined,
  };

  const response = await esClient.esql('search_latest_entities', request);

  return esqlResultToPlainObjects(response).map((doc): EntityWithSignalCounts => {
    return {
      ...toEntity(doc),
      slos: {
        healthy: doc['slos.healthy'] ?? 0,
        violated: doc['slos.violated'] ?? 0,
        degraded: doc['slos.degraded'] ?? 0,
        no_data: doc['slos.no_data'] ?? 0,
      },
      alerts: {
        active: doc['alerts.active'] ?? 0,
        total: doc['alerts.total'] ?? 0,
      },
    };
  });
}
