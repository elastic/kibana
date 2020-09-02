/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-expect-error
import geojsonvt from 'geojson-vt';
// @ts-expect-error
import vtpbf from 'vt-pbf';
import { Logger } from 'src/core/server';
import { Feature, FeatureCollection, Polygon } from 'geojson';
import {
  ES_GEO_FIELD_TYPE,
  FEATURE_ID_PROPERTY_NAME,
  KBN_TOO_MANY_FEATURES_PROPERTY,
  MVT_SOURCE_LAYER_NAME,
} from '../../common/constants';

import { hitsToGeoJson } from '../../common/elasticsearch_geo_utils';
import { flattenHit } from './util';

interface ESBounds {
  top_left: {
    lon: number;
    lat: number;
  };
  bottom_right: {
    lon: number;
    lat: number;
  };
}

export async function getTile({
  logger,
  callElasticsearch,
  index,
  geometryFieldName,
  x,
  y,
  z,
  requestBody = {},
}: {
  x: number;
  y: number;
  z: number;
  geometryFieldName: string;
  index: string;
  callElasticsearch: (type: string, ...args: any[]) => Promise<unknown>;
  logger: Logger;
  requestBody: any;
}): Promise<Buffer | null> {
  const geojsonBbox = tileToGeoJsonPolygon(x, y, z);

  let resultFeatures: Feature[];
  try {
    let result;
    try {
      const geoShapeFilter = {
        geo_shape: {
          [geometryFieldName]: {
            shape: geojsonBbox,
            relation: 'INTERSECTS',
          },
        },
      };
      requestBody.query.bool.filter.push(geoShapeFilter);

      const esSearchQuery = {
        index,
        body: requestBody,
      };

      const esCountQuery = {
        index,
        body: {
          query: requestBody.query,
        },
      };

      const countResult = await callElasticsearch('count', esCountQuery);

      // @ts-expect-error
      if (countResult.count > requestBody.size) {
        // Generate "too many features"-bounds
        const bboxAggName = 'data_bounds';
        const bboxQuery = {
          index,
          body: {
            size: 0,
            query: requestBody.query,
            aggs: {
              [bboxAggName]: {
                geo_bounds: {
                  field: geometryFieldName,
                },
              },
            },
          },
        };

        const bboxResult = await callElasticsearch('search', bboxQuery);

        // @ts-expect-error
        const bboxForData = esBboxToGeoJsonPolygon(bboxResult.aggregations[bboxAggName].bounds);

        resultFeatures = [
          {
            type: 'Feature',
            properties: {
              [KBN_TOO_MANY_FEATURES_PROPERTY]: true,
            },
            geometry: bboxForData,
          },
        ];
      } else {
        // Perform actual search
        result = await callElasticsearch('search', esSearchQuery);

        // Todo: pass in epochMillies-fields
        const featureCollection = hitsToGeoJson(
          // @ts-expect-error
          result.hits.hits,
          (hit: Record<string, unknown>) => {
            return flattenHit(geometryFieldName, hit);
          },
          geometryFieldName,
          ES_GEO_FIELD_TYPE.GEO_SHAPE,
          []
        );

        resultFeatures = featureCollection.features;

        // Correct system-fields.
        for (let i = 0; i < resultFeatures.length; i++) {
          const props = resultFeatures[i].properties;
          if (props !== null) {
            props[FEATURE_ID_PROPERTY_NAME] = resultFeatures[i].id;
          }
        }
      }
    } catch (e) {
      logger.warn(e.message);
      throw e;
    }

    const featureCollection: FeatureCollection = {
      features: resultFeatures,
      type: 'FeatureCollection',
    };

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
  } catch (e) {
    logger.warn(`Cannot generate tile for ${z}/${x}/${y}: ${e.message}`);
    return null;
  }
}

function tileToGeoJsonPolygon(x: number, y: number, z: number): Polygon {
  const wLon = tile2long(x, z);
  const sLat = tile2lat(y + 1, z);
  const eLon = tile2long(x + 1, z);
  const nLat = tile2lat(y, z);

  return {
    type: 'Polygon',
    coordinates: [
      [
        [wLon, sLat],
        [wLon, nLat],
        [eLon, nLat],
        [eLon, sLat],
        [wLon, sLat],
      ],
    ],
  };
}

function tile2long(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function esBboxToGeoJsonPolygon(esBounds: ESBounds): Polygon {
  let minLon = esBounds.top_left.lon;
  const maxLon = esBounds.bottom_right.lon;
  minLon = minLon > maxLon ? minLon - 360 : minLon; // fixes an ES bbox to straddle dateline
  const minLat = esBounds.bottom_right.lat;
  const maxLat = esBounds.top_left.lat;

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
