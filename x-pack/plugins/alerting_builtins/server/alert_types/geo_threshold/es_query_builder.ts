/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { Logger } from '../../types';
import { GEO_THRESHOLD_ID } from './alert_type';

export const OTHER_CATEGORY = 'other';
// Consider dynamically obtaining from config?
const MAX_QUERY_SIZE = 10000;

export async function getShapesFilters(
  boundaryIndexTitle: string,
  boundaryType: string,
  boundaryGeoField: string,
  geoField: string,
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'],
  log: Logger,
  alertId: string,
  boundaryNameField?: string
) {
  const filters: Record<string, unknown> = {};
  const shapesIdsNamesMap: Record<string, string> = {};
  switch (boundaryType) {
    case 'entireIndex':
      // Get all shapes in index
      const boundaryData: SearchResponse<unknown> = await callCluster('search', {
        index: boundaryIndexTitle,
        body: {
          size: MAX_QUERY_SIZE,
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
        boundaryData.hits.hits.forEach(({ _source, _id }) => {
          shapesIdsNamesMap[_id] = _source[boundaryNameField];
        });
      }
      break;
    default:
      log.info(`alert ${GEO_THRESHOLD_ID}:${alertId} Unsupported type: ${boundaryType}`);
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
    boundaryType,
  }: {
    entity: string;
    index: string;
    dateField: string;
    boundaryGeoField: string;
    geoField: string;
    boundaryIndexTitle: string;
    boundaryType: string;
    boundaryNameField?: string;
  },
  { callCluster }: { callCluster: ILegacyScopedClusterClient['callAsCurrentUser'] },
  log: Logger,
  shapesFilters: Record<string, unknown>
) {
  return async (
    gteDateTime: Date | null,
    ltDateTime: Date | null
  ): Promise<SearchResponse<unknown> | undefined> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const esQuery: Record<string, any> = {
      index,
      body: {
        size: MAX_QUERY_SIZE,
        aggs: {
          shapes: {
            filters: {
              other_bucket_key: OTHER_CATEGORY,
              filters: shapesFilters,
            },
            aggs: {
              entitySplit: {
                terms: {
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
        query: {
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
