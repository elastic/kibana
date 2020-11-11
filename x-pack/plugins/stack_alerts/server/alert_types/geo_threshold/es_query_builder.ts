/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { Logger } from '../../types';
import {
  Query,
  IIndexPattern,
  fromKueryExpression,
  toElasticsearchQuery,
  luceneStringToDsl,
} from '../../../../../../src/plugins/data/common';

export const OTHER_CATEGORY = 'other';
// Consider dynamically obtaining from config?
const MAX_TOP_LEVEL_QUERY_SIZE = 0;
const MAX_SHAPES_QUERY_SIZE = 10000;
const MAX_BUCKETS_LIMIT = 65535;

export const getEsFormattedQuery = (query: Query, indexPattern?: IIndexPattern) => {
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
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'],
  log: Logger,
  alertId: string,
  boundaryNameField?: string,
  boundaryIndexQuery?: Query
) {
  const filters: Record<string, unknown> = {};
  const shapesIdsNamesMap: Record<string, unknown> = {};
  // Get all shapes in index
  const boundaryData: SearchResponse<Record<string, unknown>> = await callCluster('search', {
    index: boundaryIndexTitle,
    body: {
      size: MAX_SHAPES_QUERY_SIZE,
      ...(boundaryIndexQuery ? { query: getEsFormattedQuery(boundaryIndexQuery) } : {}),
    },
  });

  boundaryData.hits.hits.forEach(({ _index, _id }) => {
    filters[_id] = {
      geo_shape: {
        [geoField]: {
          indexed_shape: {
            index: _index,
            id: _id,
            path: boundaryGeoField,
          },
        },
      },
    };
  });
  if (boundaryNameField) {
    boundaryData.hits.hits.forEach(
      ({ _source, _id }: { _source: Record<string, unknown>; _id: string }) => {
        shapesIdsNamesMap[_id] = _source[boundaryNameField];
      }
    );
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
  { callCluster }: { callCluster: ILegacyScopedClusterClient['callAsCurrentUser'] },
  log: Logger,
  shapesFilters: Record<string, unknown>
) {
  return async (
    gteDateTime: Date | null,
    ltDateTime: Date | null
  ): Promise<SearchResponse<unknown> | undefined> => {
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
        size: MAX_TOP_LEVEL_QUERY_SIZE,
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
                      docvalue_fields: [entity, dateField, geoField],
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

    let esResult: SearchResponse<unknown> | undefined;
    try {
      esResult = await callCluster('search', esQuery);
    } catch (err) {
      log.warn(`${err.message}`);
    }
    return esResult;
  };
}
