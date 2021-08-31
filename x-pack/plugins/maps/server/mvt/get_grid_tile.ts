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
import { Feature, FeatureCollection } from 'geojson';
import {
  COUNT_PROP_NAME,
  ES_GEO_FIELD_TYPE,
  GEOTILE_GRID_AGG_NAME,
  KBN_FEATURE_COUNT,
  KBN_IS_TILE_COMPLETE,
  KBN_METADATA_FEATURE,
  KBN_VECTOR_SHAPE_TYPE_COUNTS,
  MAX_ZOOM,
  MVT_AGGS_SOURCE_LAYER_NAME,
  RENDER_AS,
  SUPER_FINE_ZOOM_DELTA,
  VECTOR_SHAPE_TYPE,
} from '../../common/constants';

import {
  convertRegularRespToGeoJson,
  formatEnvelopeAsPolygon,
} from '../../common/elasticsearch_util';
import { ESBounds, tileToESBbox } from '../../common/geo_tile_utils';
import { pluckRangeFieldMeta } from '../../common/pluck_range_field_meta';
import { FieldMeta, TileMetaFeature } from '../../common/descriptor_types';
import { pluckCategoryFieldMeta } from '../../common/pluck_category_field_meta';
import { createMvtTile, getTileSpatialFilter } from './util';

// heuristic. largest color-palette has 30 colors. 1 color is used for 'other'.
const TERM_COUNT = 30 - 1;

function isAbortError(error: Error) {
  return error.message === 'Request aborted' || error.message === 'Aborted';
}

export async function getEsGridTile({
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
    const path = `/${encodeURIComponent(index)}/_mvt/${geometryFieldName}/${z}/${x}/${y}`;
    console.log('getTileP', path);
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

    return createMvtTile(featureCollection, MVT_AGGS_SOURCE_LAYER_NAME, z, x, y);
  } catch (e) {
    if (!isAbortError(e)) {
      // These are often circuit breaking exceptions
      // Should return a tile with some error message
      logger.warn(`Cannot generate grid-tile for ${z}/${x}/${y}: ${e.message}`);
    }
    return null;
  }
}
