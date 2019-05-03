/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

/**
 * Converts Elasticsearch search results into GeoJson FeatureCollection
 *
 * @param {array} hits Elasticsearch search response hits array
 * @param {function} flattenHit Method to flatten hits._source and hits.fields into properties object.
 *   Should just be IndexPattern.flattenHit but wanted to avoid coupling this method to IndexPattern.
 * @param {string} geoFieldName Geometry field name
 * @param {string} geoFieldType Geometry field type ["geo_point", "geo_shape"]
 * @returns {number}
 */
export function hitsToGeoJson(hits, flattenHit, geoFieldName, geoFieldType) {
  const features = [];
  const tmpGeometriesAccumulator = [];

  for (let i = 0; i < hits.length; i++) {
    const properties = flattenHit(hits[i]);

    tmpGeometriesAccumulator.length = 0;//truncate accumulator
    if (geoFieldType === 'geo_point') {
      geoPointToGeometry(properties[geoFieldName], tmpGeometriesAccumulator);
    } else if (geoFieldType === 'geo_shape') {
      geoShapeToGeometry(properties[geoFieldName], tmpGeometriesAccumulator);
    } else {
      const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.unsupportedFieldTypeErrorMessage', {
        defaultMessage: 'Unsupported field type, expected: geo_shape or geo_point, you provided: {geoFieldType}',
        values: { geoFieldType }
      });
      throw new Error(errorMessage);
    }
    // don't include geometry field value in properties
    delete properties[geoFieldName];

    //create new geojson Feature for every individual geojson geometry.
    for (let j = 0; j < tmpGeometriesAccumulator.length; j++) {
      features.push({
        type: 'Feature',
        geometry: tmpGeometriesAccumulator[j],
        properties: properties
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features: features
  };
}

function pointGeometryFactory(lat, lon) {
  return {
    type: 'Point',
    coordinates: [lon, lat]
  };
}

export function geoPointToGeometry(value, accumulator = []) {
  if (!value) {
    return accumulator;
  }

  if (typeof value === 'string') {
    const commaSplit = value.split(',');
    if (commaSplit.length === 1) {
      const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.geohashIsUnsupportedErrorMessage', {
        defaultMessage: `Unable to convert to geojson, geohash not supported`
      });

      throw new Error(errorMessage);
    }
    // Geo-point expressed as a string with the format: "lat,lon".
    const lat = parseFloat(commaSplit[0]);
    const lon = parseFloat(commaSplit[1]);
    accumulator.push(pointGeometryFactory(lat, lon));
    return accumulator;}

  if (typeof value === 'object' && _.has(value, 'lat') && _.has(value, 'lon')) {
    // Geo-point expressed as an object with the format: { lon, lat }
    accumulator.push(pointGeometryFactory(value.lat, value.lon));
    return accumulator;
  }

  if (!Array.isArray(value)) {
    const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.unsupportedGeoPointValueErrorMessage', {
      defaultMessage: `Unsupported geo_point value: {geoPointValue}`,
      values: {
        geoPointValue: value
      }
    });
    throw new Error(errorMessage);
  }

  if (value.length === 2
      && typeof value[0] === 'number'
      && typeof value[1] === 'number') {
    // Geo-point expressed as an array with the format: [lon, lat]
    const lat = value[1];
    const lon = value[0];
    accumulator.push(pointGeometryFactory(lat, lon));
    return accumulator;
  }

  // Geo-point expressed as an array of values
  for (let i = 0; i < value.length; i++) {
    accumulator.push(geoPointToGeometry(value[i]));
  }
  return accumulator;
}

export function geoShapeToGeometry(value, accumulator = []) {
  if (!value) {
    return accumulator;
  }

  if (Array.isArray(value)) {
    // value expressed as an array of values
    for (let i = 0; i < value.length; i++) {
      accumulator.push(value[i]);
    }
    return accumulator;
  }

  // TODO handle case where value is WKT and convert to geojson
  if (typeof value === 'string') {
    const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.wktIsUnsupportedErrorMessage', {
      defaultMessage: `Unable to convert WKT to geojson, not supported`,
    });
    throw new Error(errorMessage);
  }

  const geoJson = {
    type: value.type,
    coordinates: value.coordinates
  };

  // https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-shape.html#input-structure
  // For some unknown compatibility nightmarish reason, Elasticsearch types are not capitalized the same as geojson types
  // For example: 'LineString' geojson type is 'linestring' in elasticsearch
  // Convert feature types to geojson spec values
  // Sometimes, the type in ES is capitalized correctly. Sometimes it is not. It depends on how the doc was ingested
  // The below is the correction in-place.
  switch (value.type) {
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
    case 'multipolygon':
      geoJson.type = 'MultiPolygon';
      break;
    case 'geometrycollection':
      geoJson.type = 'GeometryCollection';
      break;
    case 'envelope':
    case 'circle':
      // TODO handle envelope and circle geometry types which exist in elasticsearch but not in geojson
      throw new Error(`Unable to convert ${geoJson.type} geometry to geojson, not supported`);
  }

  accumulator.push(geoJson);
  return accumulator;
}

const POLYGON_COORDINATES_EXTERIOR_INDEX = 0;
const TOP_LEFT_INDEX = 0;
const BOTTOM_RIGHT_INDEX = 2;

export function createExtentFilter(mapExtent, geoFieldName, geoFieldType) {
  const safePolygon = convertMapExtentToPolygon(mapExtent);

  if (geoFieldType === 'geo_point') {
    const verticies = safePolygon.coordinates[POLYGON_COORDINATES_EXTERIOR_INDEX];
    return {
      geo_bounding_box: {
        [geoFieldName]: {
          top_left: verticies[TOP_LEFT_INDEX],
          bottom_right: verticies[BOTTOM_RIGHT_INDEX]
        }
      }
    };
  } else if (geoFieldType === 'geo_shape') {
    return {
      geo_shape: {
        [geoFieldName]: {
          shape: safePolygon,
          relation: 'INTERSECTS'
        }
      }
    };
  } else {
    const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.unsupportedGeoFieldTypeErrorMessage', {
      defaultMessage: `Unsupported field type, expected: geo_shape or geo_point, you provided: {geoFieldType}`,
      values: { geoFieldType }
    });
    throw new Error(errorMessage);
  }
}

function formatEnvelopeAsPolygon({ maxLat, maxLon, minLat, minLon }) {
  // GeoJSON mandates that the outer polygon must be counterclockwise to avoid ambiguous polygons
  // when the shape crosses the dateline
  const left = minLon;
  const right = maxLon;
  const top = maxLat > 90 ? 90 : maxLat;
  const bottom = minLat < -90 ? -90 : minLat;
  const topLeft = [left, top];
  const bottomLeft = [left, bottom];
  const bottomRight = [right, bottom];
  const topRight = [right, top];
  return {
    'type': 'polygon',
    'coordinates': [
      [ topLeft, bottomLeft, bottomRight, topRight, topLeft ]
    ]
  };
}

/*
 * Convert map bounds to polygon
 */
export function convertMapExtentToPolygon({ maxLat, maxLon, minLat, minLon }) {
  const lonDelta = maxLon - minLon;
  if (lonDelta >= 360) {
    return formatEnvelopeAsPolygon({
      maxLat,
      maxLon: 180,
      minLat,
      minLon: -180,
    });
  }

  if (maxLon > 180) {
    // bounds cross dateline east to west
    const overlapWestOfDateLine = maxLon - 180;
    return formatEnvelopeAsPolygon({
      maxLat,
      maxLon: -180 + overlapWestOfDateLine,
      minLat,
      minLon,
    });
  }

  if (minLon < -180) {
    // bounds cross dateline west to east
    const overlapEastOfDateLine = Math.abs(minLon) - 180;
    return formatEnvelopeAsPolygon({
      maxLat,
      maxLon,
      minLat,
      minLon: 180 - overlapEastOfDateLine,
    });
  }

  return formatEnvelopeAsPolygon({ maxLat, maxLon, minLat, minLon });
}
