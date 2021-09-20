/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error
import geojsonvt from 'geojson-vt';
// @ts-expect-error
import vtpbf from 'vt-pbf';
import { Logger } from 'src/core/server';
import type { DataRequestHandlerContext } from 'src/plugins/data/server';
import { Feature, FeatureCollection, Polygon } from 'geojson';
import { countVectorShapeTypes } from '../../common/get_geometry_counts';
import {
  COUNT_PROP_NAME,
  ES_GEO_FIELD_TYPE,
  FEATURE_ID_PROPERTY_NAME,
  GEOTILE_GRID_AGG_NAME,
  KBN_FEATURE_COUNT,
  KBN_IS_TILE_COMPLETE,
  KBN_METADATA_FEATURE,
  KBN_VECTOR_SHAPE_TYPE_COUNTS,
  MAX_ZOOM,
  MVT_SOURCE_LAYER_NAME,
  RENDER_AS,
  SUPER_FINE_ZOOM_DELTA,
  VECTOR_SHAPE_TYPE,
} from '../../common/constants';

import {
  createExtentFilter,
  convertRegularRespToGeoJson,
  hitsToGeoJson,
  isTotalHitsGreaterThan,
  formatEnvelopeAsPolygon,
  TotalHits,
} from '../../common/elasticsearch_util';
import { flattenHit } from './util';
import { ESBounds, tileToESBbox } from '../../common/geo_tile_utils';
import { getCentroidFeatures } from '../../common/get_centroid_features';
import { pluckRangeFieldMeta } from '../../common/pluck_range_field_meta';
import { FieldMeta, TileMetaFeature } from '../../common/descriptor_types';
import { pluckCategoryFieldMeta } from '../../common/pluck_category_field_meta';

// heuristic. largest color-palette has 30 colors. 1 color is used for 'other'.
const TERM_COUNT = 30 - 1;

function isAbortError(error: Error) {
  return error.message === 'Request aborted' || error.message === 'Aborted';
}

export async function getGridTile({
  logger,
  context,
  index,
  geometryFieldName,
  x,
  y,
  z,
  requestBody = {},
  requestType = RENDER_AS.POINT,
  searchSessionId,
  abortSignal,
}: {
  x: number;
  y: number;
  z: number;
  geometryFieldName: string;
  index: string;
  context: DataRequestHandlerContext;
  logger: Logger;
  requestBody: any;
  requestType: RENDER_AS.GRID | RENDER_AS.POINT;
  geoFieldType: ES_GEO_FIELD_TYPE;
  searchSessionId?: string;
  abortSignal: AbortSignal;
}): Promise<Buffer | null> {
  try {
    const tileBounds: ESBounds = tileToESBbox(x, y, z);
    requestBody.query.bool.filter.push(getTileSpatialFilter(geometryFieldName, tileBounds));
    requestBody.aggs[GEOTILE_GRID_AGG_NAME].geotile_grid.precision = Math.min(
      z + SUPER_FINE_ZOOM_DELTA,
      MAX_ZOOM
    );
    requestBody.aggs[GEOTILE_GRID_AGG_NAME].geotile_grid.bounds = tileBounds;
    requestBody.track_total_hits = false;

    const response = await context
      .search!.search(
        {
          params: {
            index,
            body: requestBody,
          },
        },
        {
          sessionId: searchSessionId,
          legacyHitsTotal: false,
          abortSignal,
        }
      )
      .toPromise();
    const features: Feature[] = convertRegularRespToGeoJson(response.rawResponse, requestType);

    if (features.length) {
      const bounds = formatEnvelopeAsPolygon({
        maxLat: tileBounds.top_left.lat,
        minLat: tileBounds.bottom_right.lat,
        maxLon: tileBounds.bottom_right.lon,
        minLon: tileBounds.top_left.lon,
      });

      const fieldNames = new Set<string>();
      features.forEach((feature) => {
        for (const key in feature.properties) {
          if (feature.properties.hasOwnProperty(key) && key !== 'key' && key !== 'gridCentroid') {
            fieldNames.add(key);
          }
        }
      });

      const fieldMeta: FieldMeta = {};
      fieldNames.forEach((fieldName: string) => {
        const rangeMeta = pluckRangeFieldMeta(features, fieldName, (rawValue: unknown) => {
          if (fieldName === COUNT_PROP_NAME) {
            return parseFloat(rawValue as string);
          } else if (typeof rawValue === 'number') {
            return rawValue;
          } else if (rawValue) {
            return parseFloat((rawValue as { value: string }).value);
          } else {
            return NaN;
          }
        });

        const categoryMeta = pluckCategoryFieldMeta(features, fieldName, TERM_COUNT);

        if (!fieldMeta[fieldName]) {
          fieldMeta[fieldName] = {};
        }

        if (rangeMeta) {
          fieldMeta[fieldName].range = rangeMeta;
        }

        if (categoryMeta) {
          fieldMeta[fieldName].categories = categoryMeta;
        }
      });

      const metaDataFeature: TileMetaFeature = {
        type: 'Feature',
        properties: {
          [KBN_METADATA_FEATURE]: true,
          [KBN_FEATURE_COUNT]: features.length,
          [KBN_IS_TILE_COMPLETE]: true,
          [KBN_VECTOR_SHAPE_TYPE_COUNTS]:
            requestType === RENDER_AS.GRID
              ? {
                  [VECTOR_SHAPE_TYPE.POINT]: 0,
                  [VECTOR_SHAPE_TYPE.LINE]: 0,
                  [VECTOR_SHAPE_TYPE.POLYGON]: features.length,
                }
              : {
                  [VECTOR_SHAPE_TYPE.POINT]: features.length,
                  [VECTOR_SHAPE_TYPE.LINE]: 0,
                  [VECTOR_SHAPE_TYPE.POLYGON]: 0,
                },
          fieldMeta,
        },
        geometry: bounds,
      };

      features.push(metaDataFeature);
    }

    const featureCollection: FeatureCollection = {
      features,
      type: 'FeatureCollection',
    };

    return createMvtTile(featureCollection, z, x, y);
  } catch (e) {
    if (!isAbortError(e)) {
      // These are often circuit breaking exceptions
      // Should return a tile with some error message
      logger.warn(`Cannot generate grid-tile for ${z}/${x}/${y}: ${e.message}`);
    }
    return null;
  }
}

export async function getTile({
  logger,
  context,
  index,
  geometryFieldName,
  x,
  y,
  z,
  requestBody = {},
  geoFieldType,
  searchSessionId,
  abortSignal,
}: {
  x: number;
  y: number;
  z: number;
  geometryFieldName: string;
  index: string;
  context: DataRequestHandlerContext;
  logger: Logger;
  requestBody: any;
  geoFieldType: ES_GEO_FIELD_TYPE;
  searchSessionId?: string;
  abortSignal: AbortSignal;
}): Promise<Buffer | null> {
  let features: Feature[];
  try {
    requestBody.query.bool.filter.push(
      getTileSpatialFilter(geometryFieldName, tileToESBbox(x, y, z))
    );

    const searchOptions = {
      sessionId: searchSessionId,
      legacyHitsTotal: false,
      abortSignal,
    };

    const countResponse = await context
      .search!.search(
        {
          params: {
            index,
            body: {
              size: 0,
              query: requestBody.query,
              track_total_hits: requestBody.size + 1,
            },
          },
        },
        searchOptions
      )
      .toPromise();

    if (
      isTotalHitsGreaterThan(
        countResponse.rawResponse.hits.total as unknown as TotalHits,
        requestBody.size
      )
    ) {
      // Generate "too many features"-bounds
      const bboxResponse = await context
        .search!.search(
          {
            params: {
              index,
              body: {
                size: 0,
                query: requestBody.query,
                aggs: {
                  data_bounds: {
                    geo_bounds: {
                      field: geometryFieldName,
                    },
                  },
                },
                track_total_hits: false,
              },
            },
          },
          searchOptions
        )
        .toPromise();

      const metaDataFeature: TileMetaFeature = {
        type: 'Feature',
        properties: {
          [KBN_METADATA_FEATURE]: true,
          [KBN_IS_TILE_COMPLETE]: false,
          [KBN_FEATURE_COUNT]: 0,
          [KBN_VECTOR_SHAPE_TYPE_COUNTS]: {
            [VECTOR_SHAPE_TYPE.POINT]: 0,
            [VECTOR_SHAPE_TYPE.LINE]: 0,
            [VECTOR_SHAPE_TYPE.POLYGON]: 0,
          },
        },
        geometry: esBboxToGeoJsonPolygon(
          // @ts-expect-error @elastic/elasticsearch no way to declare aggregations for search response
          bboxResponse.rawResponse.aggregations.data_bounds.bounds,
          tileToESBbox(x, y, z)
        ),
      };
      features = [metaDataFeature];
    } else {
      const documentsResponse = await context
        .search!.search(
          {
            params: {
              index,
              body: {
                ...requestBody,
                track_total_hits: false,
              },
            },
          },
          searchOptions
        )
        .toPromise();

      const featureCollection = hitsToGeoJson(
        // @ts-expect-error hitsToGeoJson should be refactored to accept estypes.SearchHit
        documentsResponse.rawResponse.hits.hits,
        (hit: Record<string, unknown>) => {
          return flattenHit(geometryFieldName, hit);
        },
        geometryFieldName,
        geoFieldType,
        []
      );

      features = featureCollection.features;

      // Correct system-fields.
      for (let i = 0; i < features.length; i++) {
        const props = features[i].properties;
        if (props !== null) {
          props[FEATURE_ID_PROPERTY_NAME] = features[i].id;
        }
      }

      const counts = countVectorShapeTypes(features);

      const fieldNames = new Set<string>();
      features.forEach((feature) => {
        for (const key in feature.properties) {
          if (
            feature.properties.hasOwnProperty(key) &&
            key !== '_index' &&
            key !== '_id' &&
            key !== FEATURE_ID_PROPERTY_NAME
          ) {
            fieldNames.add(key);
          }
        }
      });

      const fieldMeta: FieldMeta = {};
      fieldNames.forEach((fieldName: string) => {
        const rangeMeta = pluckRangeFieldMeta(features, fieldName, (rawValue: unknown) => {
          return typeof rawValue === 'number' ? rawValue : NaN;
        });
        const categoryMeta = pluckCategoryFieldMeta(features, fieldName, TERM_COUNT);

        if (!fieldMeta[fieldName]) {
          fieldMeta[fieldName] = {};
        }

        if (rangeMeta) {
          fieldMeta[fieldName].range = rangeMeta;
        }

        if (categoryMeta) {
          fieldMeta[fieldName].categories = categoryMeta;
        }
      });

      const metadataFeature: TileMetaFeature = {
        type: 'Feature',
        properties: {
          [KBN_METADATA_FEATURE]: true,
          [KBN_IS_TILE_COMPLETE]: true,
          [KBN_VECTOR_SHAPE_TYPE_COUNTS]: counts,
          [KBN_FEATURE_COUNT]: features.length,
          fieldMeta,
        },
        geometry: esBboxToGeoJsonPolygon(tileToESBbox(x, y, z), tileToESBbox(x, y, z)),
      };

      features.push(metadataFeature);
    }

    const featureCollection: FeatureCollection = {
      features,
      type: 'FeatureCollection',
    };

    return createMvtTile(featureCollection, z, x, y);
  } catch (e) {
    if (!isAbortError(e)) {
      logger.warn(`Cannot generate tile for ${z}/${x}/${y}: ${e.message}`);
    }
    return null;
  }
}

function getTileSpatialFilter(geometryFieldName: string, tileBounds: ESBounds): unknown {
  const tileExtent = {
    minLon: tileBounds.top_left.lon,
    minLat: tileBounds.bottom_right.lat,
    maxLon: tileBounds.bottom_right.lon,
    maxLat: tileBounds.top_left.lat,
  };
  const tileExtentFilter = createExtentFilter(tileExtent, [geometryFieldName]);
  return tileExtentFilter.query;
}

function esBboxToGeoJsonPolygon(esBounds: ESBounds, tileBounds: ESBounds): Polygon {
  // Intersecting geo_shapes may push bounding box outside of tile so need to clamp to tile bounds.
  let minLon = Math.max(esBounds.top_left.lon, tileBounds.top_left.lon);
  const maxLon = Math.min(esBounds.bottom_right.lon, tileBounds.bottom_right.lon);
  minLon = minLon > maxLon ? minLon - 360 : minLon; // fixes an ES bbox to straddle dateline
  const minLat = Math.max(esBounds.bottom_right.lat, tileBounds.bottom_right.lat);
  const maxLat = Math.min(esBounds.top_left.lat, tileBounds.top_left.lat);

  return {
    type: 'Polygon',
    coordinates: [
      [
        [minLon, minLat],
        [minLon, maxLat],
        [maxLon, maxLat],
        [maxLon, minLat],
        [minLon, minLat],
      ],
    ],
  };
}

function createMvtTile(
  featureCollection: FeatureCollection,
  z: number,
  x: number,
  y: number
): Buffer | null {
  featureCollection.features.push(...getCentroidFeatures(featureCollection));
  const tileIndex = geojsonvt(featureCollection, {
    maxZoom: 24, // max zoom to preserve detail on; can't be higher than 24
    tolerance: 3, // simplification tolerance (higher means simpler)
    extent: 4096, // tile extent (both width and height)
    buffer: 64, // tile buffer on each side
    debug: 0, // logging level (0 to disable, 1 or 2)
    lineMetrics: false, // whether to enable line metrics tracking for LineString/MultiLineString features
    promoteId: null, // name of a feature property to promote to feature.id. Cannot be used with `generateId`
    generateId: false, // whether to generate feature ids. Cannot be used with `promoteId`
    indexMaxZoom: 5, // max zoom in the initial tile index
    indexMaxPoints: 100000, // max number of points per tile in the index
  });
  const tile = tileIndex.getTile(z, x, y);

  if (tile) {
    const pbf = vtpbf.fromGeojsonVt({ [MVT_SOURCE_LAYER_NAME]: tile }, { version: 2 });
    return Buffer.from(pbf);
  } else {
    return null;
  }
}
