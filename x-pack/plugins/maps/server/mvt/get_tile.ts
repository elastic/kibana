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
import { Feature, FeatureCollection, GeoJsonProperties, Geometry, Polygon } from 'geojson';
import {
  FEATURE_ID_PROPERTY_NAME,
  MVT_SOURCE_LAYER_NAME,
  KBN_TOO_MANY_FEATURES_PROPERTY,
} from '../../common/constants';

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
  indexPattern,
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
  indexPattern: string;
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
        index: indexPattern,
        body: requestBody,
      };

      const esCountQuery = {
        index: indexPattern,
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
          index: indexPattern,
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

        // @ts-expect-error
        const hitsFeatures: Array<Feature | null> = result.hits.hits.map(
          (hit: any): Feature | null => {
            let geomType:
              | 'Point'
              | 'MultiPoint'
              | 'LineString'
              | 'MultiLineString'
              | 'Polygon'
              | 'MultiPolygon';
            const geometry = hit._source[geometryFieldName];
            if (geometry.type === 'polygon' || geometry.type === 'Polygon') {
              geomType = 'Polygon';
            } else if (geometry.type === 'multipolygon' || geometry.type === 'MultiPolygon') {
              geomType = 'MultiPolygon';
            } else if (geometry.type === 'linestring' || geometry.type === 'LineString') {
              geomType = 'LineString';
            } else if (geometry.type === 'multilinestring' || geometry.type === 'MultiLineString') {
              geomType = 'MultiLineString';
            } else if (geometry.type === 'point' || geometry.type === 'Point') {
              geomType = 'Point';
            } else if (geometry.type === 'MultiPoint' || geometry.type === 'multipoint') {
              geomType = 'MultiPoint';
            } else {
              return null;
            }
            const geometryGeoJson: Geometry = {
              type: geomType,
              coordinates: geometry.coordinates,
            };

            const firstFields: GeoJsonProperties = {};
            if (hit.fields) {
              const fields = hit.fields;
              Object.keys(fields).forEach((key) => {
                const value = fields[key];
                if (Array.isArray(value)) {
                  firstFields[key] = value[0];
                } else {
                  firstFields[key] = value;
                }
              });
            }

            const properties = {
              ...hit._source,
              ...firstFields,
              _id: hit._id,
              _index: hit._index,
              [FEATURE_ID_PROPERTY_NAME]: hit._id,
              [KBN_TOO_MANY_FEATURES_PROPERTY]: false,
            };
            delete properties[geometryFieldName];

            return {
              type: 'Feature',
              id: hit._id,
              geometry: geometryGeoJson,
              properties,
            };
          }
        );

        resultFeatures = hitsFeatures.filter((f) => !!f) as Feature[];
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
