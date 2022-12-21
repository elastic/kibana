/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Feature, Geometry, MultiPolygon, Polygon, Position } from 'geojson';
// @ts-expect-error
import turfCircle from '@turf/circle';
import { FilterMeta, FILTERS } from '@kbn/es-query';
import { MapExtent } from '../descriptor_types';
import { ES_SPATIAL_RELATIONS } from '../constants';
import { getEsSpatialRelationLabel } from '../i18n_getters';
import { GeoFilter, GeoShapeQueryBody, PreIndexedShape } from './types';
import { makeESBbox } from './elasticsearch_geo_utils';

const SPATIAL_FILTER_TYPE = FILTERS.SPATIAL_FILTER;

// wrapper around boiler plate code for creating bool.should clause with nested bool.must clauses
// ensuring geoField exists prior to running geoField query
// This allows for writing a single geo filter that spans multiple indices with different geo fields.
function createMultiGeoFieldFilter(
  geoFieldNames: string[],
  meta: FilterMeta,
  createGeoFilter: (geoFieldName: string) => Omit<GeoFilter, 'meta'>
): GeoFilter {
  if (geoFieldNames.length === 0) {
    throw new Error('Unable to create filter, geo fields not provided');
  }

  if (geoFieldNames.length === 1) {
    return {
      meta: {
        ...meta,
        key: geoFieldNames[0],
      },
      query: {
        bool: {
          must: [
            {
              exists: {
                field: geoFieldNames[0],
              },
            },
            createGeoFilter(geoFieldNames[0]),
          ],
        },
      },
    };
  }

  return {
    meta: {
      ...meta,
      key: undefined,
      isMultiIndex: true,
    },
    query: {
      bool: {
        should: geoFieldNames.map((geoFieldName) => {
          return {
            bool: {
              must: [
                {
                  exists: {
                    field: geoFieldName,
                  },
                },
                createGeoFilter(geoFieldName),
              ],
            },
          };
        }),
      },
    },
  };
}

export function createExtentFilter(mapExtent: MapExtent, geoFieldNames: string[]): GeoFilter {
  const esBbox = makeESBbox(mapExtent);
  function createGeoFilter(geoFieldName: string) {
    return {
      geo_bounding_box: {
        [geoFieldName]: esBbox,
      },
    };
  }

  const meta: FilterMeta = {
    type: SPATIAL_FILTER_TYPE,
    alias: null,
    disabled: false,
    negate: false,
  };

  return createMultiGeoFieldFilter(geoFieldNames, meta, createGeoFilter);
}

export function buildGeoShapeFilter({
  preIndexedShape,
  geometry,
  geometryLabel,
  geoFieldNames,
  relation = ES_SPATIAL_RELATIONS.INTERSECTS,
}: {
  preIndexedShape?: PreIndexedShape | null;
  geometry?: MultiPolygon | Polygon;
  geometryLabel: string;
  geoFieldNames: string[];
  relation?: ES_SPATIAL_RELATIONS;
}): GeoFilter {
  const meta: FilterMeta = {
    type: SPATIAL_FILTER_TYPE,
    negate: false,
    key: geoFieldNames.length === 1 ? geoFieldNames[0] : undefined,
    alias: `${getEsSpatialRelationLabel(relation)} ${geometryLabel}`,
    disabled: false,
  };

  function createGeoFilter(geoFieldName: string) {
    const shapeQuery: GeoShapeQueryBody = {
      relation,
    };
    if (preIndexedShape) {
      shapeQuery.indexed_shape = preIndexedShape;
    } else if (geometry) {
      shapeQuery.shape = geometry;
    } else {
      throw new Error('Must supply either preIndexedShape or geometry, you did not supply either');
    }

    return {
      geo_shape: {
        ignore_unmapped: true,
        [geoFieldName]: shapeQuery,
      },
    };
  }

  // Currently no way to create an object with exclude property from index signature
  // typescript error for "ignore_unmapped is not assignable to type 'GeoShapeQueryBody'" expected"
  // @ts-expect-error
  return createMultiGeoFieldFilter(geoFieldNames, meta, createGeoFilter);
}

export function buildGeoGridFilter({
  geoFieldNames,
  gridId,
  isHex,
}: {
  geoFieldNames: string[];
  gridId: string;
  isHex: boolean;
}): GeoFilter {
  return createMultiGeoFieldFilter(
    geoFieldNames,
    {
      type: SPATIAL_FILTER_TYPE,
      negate: false,
      key: geoFieldNames.length === 1 ? geoFieldNames[0] : undefined,
      alias: i18n.translate('xpack.maps.common.esSpatialRelation.clusterFilterLabel', {
        defaultMessage: 'intersects cluster {gridId}',
        values: { gridId },
      }),
      disabled: false,
    } as FilterMeta,
    (geoFieldName: string) => {
      const payload = isHex ? { geohex: gridId } : { geotile: gridId };
      return {
        geo_grid: {
          [geoFieldName]: payload,
        },
      };
    }
  );
}

export function createDistanceFilterWithMeta({
  alias,
  distanceKm,
  geoFieldNames,
  point,
}: {
  alias?: string;
  distanceKm: number;
  geoFieldNames: string[];
  point: Position;
}): GeoFilter {
  const meta: FilterMeta = {
    type: SPATIAL_FILTER_TYPE,
    negate: false,
    alias: alias
      ? alias
      : i18n.translate('xpack.maps.es_geo_utils.distanceFilterAlias', {
          defaultMessage: 'within {distanceKm}km of {pointLabel}',
          values: {
            distanceKm,
            pointLabel: point.join(', '),
          },
        }),
    disabled: false,
  };

  function createGeoFilter(geoFieldName: string) {
    return {
      geo_distance: {
        distance: `${distanceKm}km`,
        [geoFieldName]: point,
      },
    };
  }

  return createMultiGeoFieldFilter(geoFieldNames, meta, createGeoFilter);
}

function extractGeometryFromFilter(geoFieldName: string, filter: GeoFilter): Geometry | undefined {
  if (filter.geo_distance && filter.geo_distance[geoFieldName]) {
    const distanceSplit = filter.geo_distance.distance.split('km');
    const distance = parseFloat(distanceSplit[0]);
    const circleFeature = turfCircle(filter.geo_distance[geoFieldName], distance);
    return circleFeature.geometry;
  }

  if (filter.geo_shape && filter.geo_shape[geoFieldName] && filter.geo_shape[geoFieldName].shape) {
    return filter.geo_shape[geoFieldName].shape;
  }
}

export function extractFeaturesFromFilters(filters: GeoFilter[]): Feature[] {
  const features: Feature[] = [];
  filters
    .filter((filter) => {
      return filter.meta.type === SPATIAL_FILTER_TYPE;
    })
    .forEach((filter) => {
      let geometry: Geometry | undefined;
      if (filter.meta.isMultiIndex) {
        const geoFieldName = filter?.query?.bool?.should?.[0]?.bool?.must?.[0]?.exists?.field;
        const spatialClause = filter?.query?.bool?.should?.[0]?.bool?.must?.[1];
        if (geoFieldName && spatialClause) {
          geometry = extractGeometryFromFilter(geoFieldName, spatialClause);
        }
      } else {
        const geoFieldName = filter.meta.key;
        const spatialClause = filter?.query?.bool?.must?.[1];
        if (geoFieldName && spatialClause) {
          geometry = extractGeometryFromFilter(geoFieldName, spatialClause);
        }
      }

      if (geometry) {
        features.push({
          type: 'Feature',
          geometry,
          properties: {
            filter: filter.meta.alias,
          },
        });
      }
    });

  return features;
}
