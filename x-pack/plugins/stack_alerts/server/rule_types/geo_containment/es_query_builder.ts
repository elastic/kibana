/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  fromKueryExpression,
  toElasticsearchQuery,
  luceneStringToDsl,
  DataViewBase,
  Query,
} from '@kbn/es-query';

export const OTHER_CATEGORY = 'other';
// Consider dynamically obtaining from config?
const MAX_SHAPES_QUERY_SIZE = 10000;
const MAX_BUCKETS_LIMIT = 65535;

interface BoundaryHit {
  _index: string;
  _id: string;
  fields?: Record<string, unknown[]>;
}

export const getEsFormattedQuery = (query: Query, indexPattern?: DataViewBase) => {
  let esFormattedQuery;

  const queryLanguage = query.language;
  if (queryLanguage === 'kuery') {
    const ast = fromKueryExpression(query.query);
    esFormattedQuery = toElasticsearchQuery(ast, indexPattern);
  } else {
    esFormattedQuery = luceneStringToDsl(query.query);
  }
  return esFormattedQuery;
};

export async function getShapesFilters(
  boundaryIndexTitle: string,
  boundaryGeoField: string,
  geoField: string,
  esClient: ElasticsearchClient,
  log: Logger,
  alertId: string,
  boundaryNameField?: string,
  boundaryIndexQuery?: Query
) {
  const filters: Record<string, unknown> = {};
  const shapesIdsNamesMap: Record<string, unknown> = {};
  // Get all shapes in index
  const boundaryData = await esClient.search<Record<string, BoundaryHit>>({
    index: boundaryIndexTitle,
    body: {
      size: MAX_SHAPES_QUERY_SIZE,
      _source: false,
      fields: boundaryNameField ? [boundaryNameField] : [],
      ...(boundaryIndexQuery ? { query: getEsFormattedQuery(boundaryIndexQuery) } : {}),
    },
  });

  for (let i = 0; i < boundaryData.hits.hits.length; i++) {
    const boundaryHit: BoundaryHit = boundaryData.hits.hits[i];
    filters[boundaryHit._id] = {
      geo_shape: {
        [geoField]: {
          indexed_shape: {
            index: boundaryHit._index,
            id: boundaryHit._id,
            path: boundaryGeoField,
          },
        },
      },
    };
    if (
      boundaryNameField &&
      boundaryHit.fields &&
      boundaryHit.fields[boundaryNameField] &&
      boundaryHit.fields[boundaryNameField].length
    ) {
      // fields API always returns an array, grab first value
      shapesIdsNamesMap[boundaryHit._id] = boundaryHit.fields[boundaryNameField][0];
    }
  }

  return {
    shapesFilters: filters,
    shapesIdsNamesMap,
  };
}

export async function executeEsQueryFactory(
  {
    entity,
    index,
    dateField,
    boundaryGeoField,
    geoField,
    boundaryIndexTitle,
    indexQuery,
  }: {
    entity: string;
    index: string;
    dateField: string;
    boundaryGeoField: string;
    geoField: string;
    boundaryIndexTitle: string;
    boundaryNameField?: string;
    indexQuery?: Query;
  },
  esClient: ElasticsearchClient,
  log: Logger,
  shapesFilters: Record<string, unknown>
) {
  return async (
    gteDateTime: Date | null,
    ltDateTime: Date | null
  ): Promise<estypes.SearchResponse<unknown> | undefined> => {
    let esFormattedQuery;
    if (indexQuery) {
      const gteEpochDateTime = gteDateTime ? new Date(gteDateTime).getTime() : null;
      const ltEpochDateTime = ltDateTime ? new Date(ltDateTime).getTime() : null;
      const dateRangeUpdatedQuery =
        indexQuery.language === 'kuery'
          ? `(${dateField} >= "${gteEpochDateTime}" and ${dateField} < "${ltEpochDateTime}") and (${indexQuery.query})`
          : `(${dateField}:[${gteDateTime} TO ${ltDateTime}]) AND (${indexQuery.query})`;
      esFormattedQuery = getEsFormattedQuery({
        query: dateRangeUpdatedQuery,
        language: indexQuery.language,
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const esQuery: Record<string, any> = {
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

    let esResult: estypes.SearchResponse<unknown> | undefined;
    try {
      esResult = await esClient.search(esQuery);
    } catch (err) {
      log.warn(`${err.message}`);
    }
    return esResult;
  };
}
