/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { OTHER_CATEGORY } from '../constants';
import { getQueryDsl } from './get_query_dsl';
import type { GeoContainmentRuleParams } from '../types';

const MAX_BUCKETS_LIMIT = 65535;

export async function executeEsQuery(
  params: GeoContainmentRuleParams,
  esClient: ElasticsearchClient,
  shapesFilters: Record<string, unknown>,
  gteDateTime: Date | null,
  ltDateTime: Date | null
): Promise<estypes.SearchResponse<unknown>> {
  const { entity, index, dateField, geoField, indexQuery } = params;
  let esFormattedQuery;
  if (indexQuery) {
    const gteEpochDateTime = gteDateTime ? new Date(gteDateTime).getTime() : null;
    const ltEpochDateTime = ltDateTime ? new Date(ltDateTime).getTime() : null;
    const dateRangeUpdatedQuery =
      indexQuery.language === 'kuery'
        ? `(${dateField} >= "${gteEpochDateTime}" and ${dateField} < "${ltEpochDateTime}") and (${indexQuery.query})`
        : `(${dateField}:[${gteDateTime} TO ${ltDateTime}]) AND (${indexQuery.query})`;
    esFormattedQuery = getQueryDsl({
      query: dateRangeUpdatedQuery,
      language: indexQuery.language,
    });
  }

  const esQuery = {
    index,
    body: {
      size: 0, // do not fetch hits
      aggs: {
        shapes: {
          filters: {
            other_bucket_key: OTHER_CATEGORY,
            filters: shapesFilters,
          },
          aggs: {
            entitySplit: {
              terms: {
                size: MAX_BUCKETS_LIMIT / ((Object.keys(shapesFilters).length || 1) * 2),
                field: entity,
              },
              aggs: {
                entityHits: {
                  top_hits: {
                    size: 1,
                    sort: [
                      {
                        [dateField]: {
                          order: 'desc',
                        },
                      },
                    ],
                    docvalue_fields: [
                      entity,
                      {
                        field: dateField,
                        format: 'strict_date_optional_time',
                      },
                      geoField,
                    ],
                    _source: false,
                  },
                },
              },
            },
          },
        },
      },
      query: esFormattedQuery
        ? esFormattedQuery
        : {
            bool: {
              must: [],
              filter: [
                {
                  match_all: {},
                },
                {
                  range: {
                    [dateField]: {
                      ...(gteDateTime ? { gte: gteDateTime } : {}),
                      lt: ltDateTime, // 'less than' to prevent overlap between intervals
                      format: 'strict_date_optional_time',
                    },
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          },
      stored_fields: ['*'],
      docvalue_fields: [
        {
          field: dateField,
          format: 'date_time',
        },
      ],
    },
  };

  try {
    return await esClient.search(esQuery);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackAlerts.geoContainment.entityContainmentFetchError', {
        defaultMessage: 'Unable to fetch entity containment, error: {error}',
        values: { error: err.message },
      })
    );
  }
}
