/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export function hitsToGeoJson(hits, geoFieldName, geoFieldType) {
  const features = hits
    .filter(hit => {
      return _.has(hit, `_source[${geoFieldName}]`);
    })
    .map(hit => {
      const value = _.get(hit, `_source[${geoFieldName}]`);
      let geometry;
      if (geoFieldType === 'geo_point') {
        geometry = geoPointToGeometry(value);
      } else if (geoFieldType === 'geo_shape') {
        geometry = geoShapeToGeometry(value);
      } else {
        throw new Error(`Unsupported field type, expected: geo_shape or geo_point, you provided: ${geoFieldType}`);
      }
      return {
        type: 'Feature',
        geometry: geometry
      };
    });

  return {
    type: 'FeatureCollection',
    features: features
  };
}

export function geoPointToGeometry(value) {
  let lat;
  let lon;
  if (typeof value === 'string') {
    const commaSplit = value.split(',');
    if (commaSplit.length === 1) {
      // Geo-point expressed as a geohash.
      throw new Error(`Unable to convert to geojson, geohash not supported`);
    }
    // Geo-point expressed as a string with the format: "lat,lon".
    lat = parseFloat(commaSplit[0]);
    lon = parseFloat(commaSplit[1]);
  } else if (Array.isArray(value)) {
    // Geo-point expressed as an array with the format: [ lon, lat]
    lat = value[1];
    lon = value[0];
  } else if (value !== null && typeof value === 'object') {
    lat = value.lat;
    lon = value.lon;
  }

  return {
    type: 'Point',
    coordinates: [lon, lat]
  };
}

export function geoShapeToGeometry(value) {
  // TODO handle case where value is WKT and convert to geojson
  if (typeof value === "string") {
    throw new Error(`Unable to convert WKT to geojson, not supported`);
  }

  const geoJson = _.cloneDeep(value);

  // https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-shape.html#input-structure
  // For some unknown compatibility nightmarish reason, Elasticsearch types are not capitalized the same as geojson types
  // For example: 'LineString' geojson type is 'linestring' in elasticsearch
  // Convert feature types to geojson spec values
  switch (geoJson.type) {
    case 'point':
      geoJson.type = 'Point';
      break;
    case 'linestring':
      geoJson.type = 'LineString';
      break;
    case 'polygon':
      geoJson.type = 'Polygon';
      break;
    case 'multipoint':
      geoJson.type = 'MultiPoint';
      break;
    case 'multilinestring':
      geoJson.type = 'MultiLineString';
      break;
    case 'geometrycollection':
      geoJson.type = 'GeometryCollection';
      break;
  }

  // TODO handle envelope and circle geometry types which exist in elasticsearch but not in geojson
  if (geoJson.type === 'envelope' || geoJson.type === 'circle') {
    throw new Error(`Unable to convert ${geoJson.type} geometry to geojson, not supported`);
  }

  return geoJson;
}

