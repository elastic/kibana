/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


import { Logger } from 'src/core/server';
import type { DataRequestHandlerContext } from 'src/plugins/data/server';
import { Feature, FeatureCollection, Polygon } from 'geojson';
import { countVectorShapeTypes } from '../../common/get_geometry_counts';
import {
  ES_GEO_FIELD_TYPE,
  FEATURE_ID_PROPERTY_NAME,
  KBN_FEATURE_COUNT,
  KBN_IS_TILE_COMPLETE,
  KBN_METADATA_FEATURE,
  KBN_VECTOR_SHAPE_TYPE_COUNTS,
  MVT_HITS_SOURCE_LAYER_NAME,
  VECTOR_SHAPE_TYPE,
} from '../../common/constants';

import { hitsToGeoJson, isTotalHitsGreaterThan, TotalHits } from '../../common/elasticsearch_util';
import { flattenHit } from './util';
import { ESBounds, tileToESBbox } from '../../common/geo_tile_utils';
import { pluckRangeFieldMeta } from '../../common/pluck_range_field_meta';
import { FieldMeta, TileMetaFeature } from '../../common/descriptor_types';
import { pluckCategoryFieldMeta } from '../../common/pluck_category_field_meta';
import { getTileSpatialFilter, createMvtTile } from './util';

// heuristic. largest color-palette has 30 colors. 1 color is used for 'other'.
const TERM_COUNT = 30 - 1;

function isAbortError(error: Error) {
  return error.message === 'Request aborted' || error.message === 'Aborted';
}

export async function getEsTile({
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
  try {
    const path = `/${encodeURIComponent(index)}/_mvt/${geometryFieldName}/${z}/${x}/${y}`;
    console.log('getEsTileP', path);
    const tile = await context.core.elasticsearch.client.asCurrentUser.transport.request({
      method: 'GET',
      path,
    });
    // let buffer = Buffer.from(tile.body, 'base64');
    const buffer = tile.body;
    console.log('buf length', buffer.length);
    // console.log('s', buffer.toString('base64'));
    return buffer;
  } catch (e) {
    if (!isAbortError(e)) {
      // These are often circuit breaking exceptions
      // Should return a tile with some error message
      logger.warn(`Cannot generate ES-grid-tile for ${z}/${x}/${y}: ${e.message}`);
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
        (countResponse.rawResponse.hits.total as unknown) as TotalHits,
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

    return createMvtTile(featureCollection, MVT_HITS_SOURCE_LAYER_NAME, z, x, y);
  } catch (e) {
    if (!isAbortError(e)) {
      logger.warn(`Cannot generate tile for ${z}/${x}/${y}: ${e.message}`);
    }
    return null;
  }
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
