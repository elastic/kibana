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

async function getShapesFilters(
  boundaryIndexTitle: string,
  boundaryType: string,
  boundaryGeoField: string,
  geoField: string,
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'],
  log: Logger,
  alertId: string
) {
  const filters: Record<string, unknown> = {};
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
      break;
    default:
      log.info(`alert ${GEO_THRESHOLD_ID}:${alertId} Unsupported type: ${boundaryType}`);
  }
  return filters;
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
  },
  { callCluster }: { callCluster: ILegacyScopedClusterClient['callAsCurrentUser'] },
  log: Logger,
  alertId: string
) {
  const shapesFilters = await getShapesFilters(
    boundaryIndexTitle,
    boundaryType,
    boundaryGeoField,
    geoField,
    callCluster,
    log,
    alertId
  );
  return async (
    gteDateTime: Date | null,
    ltDateTime: Date | null, // 'less than' to prevent overlap between intervals
    topHitsQty: number = 1
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
                      size: topHitsQty,
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
                    lt: ltDateTime,
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
