/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertType } from '../../../alerts/server';
import { APP_ID } from '../../common/constants';

const actionGroupId = i18n.translate(
  'xpack.alertingBuiltins.indexThreshold.actionGroupThresholdMetTitle',
  {
    defaultMessage: 'Geo threshold met',
  }
);

const actionGroupName = i18n.translate(
  'xpack.alertingBuiltins.indexThreshold.actionGroupThresholdMetTitle',
  {
    defaultMessage: 'Geo threshold met',
  }
);

function getShapesFilter(type: string, shapesArr: unknown[]) {
  const shapesFilter = {
    bool: {
      should: [],
      minimum_should_match: 1,
    },
  };
  switch (type) {
    case 'indexedShapes':
      shapesArr.forEach((shape: unknown) => {
        const { index, id, path } = shape;
        shapesFilter.bool.should.push({
          bool: {
            should: [
              {
                geo_shape: {
                  location: {
                    indexed_shape: {
                      index,
                      id,
                      path,
                    },
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        });
      });
      break;
    case 'poly':
      shapesArr.forEach((coords: unknown) => {
        shapesFilter.bool.should.push({
          bool: {
            should: [
              {
                geo_shape: {
                  ignore_unmapped: true,
                  DestLocation: {
                    relation: 'INTERSECTS',
                    shape: {
                      coordinates: coords,
                      type: 'Polygon',
                    },
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        });
      });
      break;
    case 'bbox':
      shapesArr.forEach((coords: unknown) => {
        const { topLeft, bottomRight } = coords;
        shapesFilter.bool.should.push({
          bool: {
            should: [
              {
                geo_bounding_box: {
                  'pin.location': {
                    top_left: topLeft,
                    bottom_right: bottomRight,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        });
      });
      break;
    default:
      console.error(`Unsupported type: ${type}`);
  }
  return shapesFilter;
}

export const alertType: {
  defaultActionGroupId: string;
  actionVariables: any[];
  actionGroups: Array<{ name: string; id: string }>;
  executor({
    services: { callCluster, log },
    params,
  }: {
    services: { callCluster: any; log: any };
    params: any;
  }): Promise<{ results: any[] } | {}>;
  name: string;
  producer: string;
  id: string;
} = {
  id: 'maps.geo-threshold',
  name: 'Check if one or more documents has entered or left a defined geo area',
  actionGroups: [{ id: actionGroupId, name: actionGroupName }],
  defaultActionGroupId: 'default',
  actionVariables: [],
  async executor({ services: { callCluster, log }, params }) {
    const { entity, index, dateField, shapesArr, type } = params;

    const esQuery: any = {
      index,
      body: {
        size: 0,
        query: {
          size: 0,
          aggs: {
            totalEntities: {
              cardinality: {
                precision_threshold: 1,
                field: entity,
              },
            },
            entitySplit: {
              terms: {
                size: 65535,
                shard_size: 65535,
                field: entity,
              },
              aggs: {
                entityHits: {
                  top_hits: {
                    size: 1,
                    _source: false,
                  },
                },
              },
            },
          },
          stored_fields: ['*'],
          docvalue_fields: [
            {
              field: dateField,
              format: 'date_time',
            },
          ],
          query: {
            bool: {
              filter: [getShapesFilter(type, shapesArr)],
              should: [],
              must_not: [],
            },
          },
        },
      },
      ignoreUnavailable: true,
      allowNoIndices: true,
      ignore: [404],
    };
    let esResult = [];
    try {
      esResult = await callCluster('search', esQuery);
    } catch (err) {
      log.warn(['warn', 'maps']`${err.message}`);
    }

    return {
      esResult,
    };
  },
  producer: APP_ID,
};
