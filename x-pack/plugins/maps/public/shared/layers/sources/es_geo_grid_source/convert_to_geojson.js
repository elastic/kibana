/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decodeGeoHash } from 'ui/utils/decode_geo_hash';
import { gridDimensions } from 'ui/vis/map/grid_dimensions';

/*
 * Fork of ui/public/vis/map/convert_to_geojson.js that supports multiple metrics
 */
export function convertToGeoJson(tabifiedResponse) {

  let features;
  const min = Infinity;
  const max = -Infinity;
  let geoAgg;

  if (tabifiedResponse && tabifiedResponse.rows) {

    const table = tabifiedResponse;
    const geohashColumn = table.columns.find(column => column.aggConfig.type.dslName === 'geohash_grid');

    if (!geohashColumn) {
      features = [];
    } else {

      geoAgg = geohashColumn.aggConfig;

      const metricColumns = table.columns.filter(column => {
        return column.aggConfig.type.type === 'metrics'
          && column.aggConfig.type.dslName !== 'geo_centroid';
      });
      const geocentroidColumn = table.columns.find(column => column.aggConfig.type.dslName === 'geo_centroid');

      features = table.rows.map(row => {

        const geohash = row[geohashColumn.id];
        if (!geohash) return false;
        const geohashLocation = decodeGeoHash(geohash);

        let pointCoordinates;
        if (geocentroidColumn) {
          const location = row[geocentroidColumn.id];
          pointCoordinates = [location.lon, location.lat];
        } else {
          pointCoordinates = [geohashLocation.longitude[2], geohashLocation.latitude[2]];
        }

        const rectangle = [
          [geohashLocation.latitude[0], geohashLocation.longitude[0]],
          [geohashLocation.latitude[0], geohashLocation.longitude[1]],
          [geohashLocation.latitude[1], geohashLocation.longitude[1]],
          [geohashLocation.latitude[1], geohashLocation.longitude[0]],
        ];

        const centerLatLng = [
          geohashLocation.latitude[2],
          geohashLocation.longitude[2]
        ];

        if (geoAgg.params.useGeocentroid) {
          // see https://github.com/elastic/elasticsearch/issues/24694 for why clampGrid is used
          pointCoordinates[0] = clampGrid(pointCoordinates[0], geohashLocation.longitude[0], geohashLocation.longitude[1]);
          pointCoordinates[1] = clampGrid(pointCoordinates[1], geohashLocation.latitude[0], geohashLocation.latitude[1]);
        }

        const metrics = {};
        metricColumns.forEach(metricColumn => {
          metrics[metricColumn.aggConfig.id] = row[metricColumn.id];
        });
        //const value = row[metricColumn.id];
        //min = Math.min(min, value);
        //max = Math.max(max, value);

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: pointCoordinates
          },
          properties: {
            geohash: geohash,
            geohash_meta: {
              center: centerLatLng,
              rectangle: rectangle
            },
            ...metrics
          }
        };


      }).filter(row => row);

    }

  } else {
    features = [];
  }

  const featureCollection = {
    type: 'FeatureCollection',
    features: features
  };

  return {
    featureCollection: featureCollection,
    meta: {
      min: min,
      max: max,
      geohashGridDimensionsAtEquator: geoAgg && gridDimensions(geoAgg.params.precision)
    }
  };
}

function clampGrid(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}
