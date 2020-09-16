/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient } from 'kibana/server';

export const OTHER_CATEGORY = 'other';

async function getShapesFilters(
  boundaryIndexTitle: string,
  boundaryType: string,
  boundaryGeoField: string,
  geoField: string,
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'],
  log: Logger
) {
  const filters = {};
  switch (boundaryType) {
    case 'entireIndex':
      // Get all shapes in index
      const boundaryData = await callCluster('search', {
        index: boundaryIndexTitle,
        body: {},
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
      log.info(`Unsupported type: ${boundaryType}`);
  }
  return filters;
}

export async function executeEsQueryFactory(
  {
    entity,
    indexTitle,
    dateField,
    boundaryGeoField,
    geoField,
    boundaryIndexTitle,
    boundaryType,
  }: {
    entity: string;
    indexTitle: string;
    dateField: string;
    boundaryGeoField: string;
    geoField: string;
    boundaryIndexTitle: string;
    boundaryType: string;
  },
  { callCluster }: { callCluster: ILegacyScopedClusterClient['callAsCurrentUser'] },
  log: Logger
) {
  const shapesFilters = await getShapesFilters(
    boundaryIndexTitle,
    boundaryType,
    boundaryGeoField,
    geoField,
    callCluster,
    log
  );
  return async (
    gteDateTime: string | undefined,
    ltDateTime: string, // 'less than' to prevent overlap between intervals
    topHitsQty: number = 1
  ) => {
    const esQuery: unknown = {
      index: indexTitle,
      body: {
        size: 0,
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

    let esResult;
    try {
      esResult = await callCluster('search', esQuery);
    } catch (err) {
      log.warn(`${err.message}`);
    }
    return esResult;
  };
}
