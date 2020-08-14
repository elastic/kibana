/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import _ from 'lodash';
import {
  FEATURE_ID_PROPERTY_NAME,
  MVT_SOURCE_LAYER_NAME,
  KBN_TOO_MANY_FEATURES_PROPERTY,
} from '../../common/constants';

export async function getTile({
  logger,
  callElasticSearch,
  indexPattern,
  geometryFieldName,
  x,
  y,
  z,
  requestBody = {},
}) {
  const geojsonBbox = tileToGeoJsonPolygon(x, y, z);

  logger.warn({ polygon: geojsonBbox });
  let resultFeatures;

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

      logger.warn(`going to call elasticsearch count`);
      const countResult = await callElasticSearch('count', esCountQuery);

      if (countResult.count > requestBody.size) {
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

        logger.warn(`going to call size`);
        const bboxResult = await callElasticSearch('search', bboxQuery);
        logger.warn({ agg: bboxResult.aggregations[bboxAggName] });

        const bboxForData = esBboxToGeoJsonPolygon(
          bboxResult.aggregations[bboxAggName].bounds,
          logger
        );

        logger.warn({ bboxForData });
        logger.warn({ coordinates: bboxForData.coordinates });

        resultFeatures = [
          {
            type: 'Feature',
            properties: {
              [KBN_TOO_MANY_FEATURES_PROPERTY]: true,
            },
            // geometry: geojsonBbox,
            geometry: bboxForData,
          },
        ];
      } else {
        result = await callElasticSearch('search', esSearchQuery);

        const feats = result.hits.hits.map((hit) => {
          let geomType;
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
          const geometryGeoJson = {
            type: geomType,
            coordinates: geometry.coordinates,
          };

          const firstFields = {};
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
        });

        resultFeatures = feats.filter((f) => !!f);
      }
    } catch (e) {
      logger.warn(e.message);
      throw e;
    }

    const featureCollection = {
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
    return null;
  }
}

function tileToGeoJsonPolygon(x, y, z) {
  const wLon = tile2long(x, z);
  const sLat = tile2lat(y + 1, z);
  const eLon = tile2long(x + 1, z);
  const nLat = tile2lat(y, z);

  const polygon = {
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

  return polygon;
}

tile2long(0, 1);
tile2lat(1, 20);

function tile2long(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function esBboxToGeoJsonPolygon(esBounds, logger) {
  let minLon = esBounds.top_left.lon;
  const maxLon = esBounds.bottom_right.lon;
  minLon = minLon > maxLon ? minLon - 360 : minLon; // fixes an ES bbox to straddle dateline
  const minLat = esBounds.bottom_right.lat;
  const maxLat = esBounds.top_left.lat;

  logger.warn({ minLon, maxLon, minLat, maxLat });

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
