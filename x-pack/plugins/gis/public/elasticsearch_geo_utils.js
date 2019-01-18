/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

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
  hits.forEach(hit => {
    const value = _.get(hit, `_source[${geoFieldName}]`);
    let geometries;
    if (geoFieldType === 'geo_point') {
      geometries = geoPointToGeometry(value);
    } else if (geoFieldType === 'geo_shape') {
      geometries = geoShapeToGeometry(value);
    } else {
      throw new Error(`Unsupported field type, expected: geo_shape or geo_point, you provided: ${geoFieldType}`);
    }

    const properties = flattenHit(hit);
    // don't include geometry field value in properties
    delete properties[geoFieldName];

    return geometries.map(geometry => {
      features.push({
        type: 'Feature',
        geometry: geometry,
        properties: properties
      });
    });
  });

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

export function geoPointToGeometry(value) {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    const commaSplit = value.split(',');
    if (commaSplit.length === 1) {
      // Geo-point expressed as a geohash.
      throw new Error(`Unable to convert to geojson, geohash not supported`);
    }
    // Geo-point expressed as a string with the format: "lat,lon".
    const lat = parseFloat(commaSplit[0]);
    const lon = parseFloat(commaSplit[1]);
    return [pointGeometryFactory(lat, lon)];
  }

  if (typeof value === 'object' && _.has(value, 'lat') && _.has(value, 'lon')) {
    // Geo-point expressed as an object with the format: { lon, lat }
    return [pointGeometryFactory(value.lat, value.lon)];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Unsupported geo_point value: ${value}`);
  }

  if (value.length === 2
      && typeof value[0] === 'number'
      && typeof value[1] === 'number') {
    // Geo-point expressed as an array with the format: [lon, lat]
    const lat = value[1];
    const lon = value[0];
    return [pointGeometryFactory(lat, lon)];
  }

  // Geo-point expressed as an array of values
  return value.reduce(
    (points, itemInValueArray) => {
      return points.concat(geoPointToGeometry(itemInValueArray));
    },
    []
  );
}


export function makeGeohashGridPolygon(geohashGridFeature) {
  const esBbox = geohashGridFeature.properties.geohash_meta.rectangle;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [esBbox[0][1], esBbox[0][0]],
        [esBbox[1][1], esBbox[1][0]],
        [esBbox[2][1], esBbox[2][0]],
        [esBbox[3][1], esBbox[3][0]],
        [esBbox[0][1], esBbox[0][0]],
      ]
    ]
  };
}

export function geoShapeToGeometry(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    // value expressed as an array of values
    return value.reduce(
      (shapes, itemInValueArray) => {
        return shapes.concat(geoShapeToGeometry(itemInValueArray));
      },
      []
    );
  }

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
    case 'envelope':
    case 'circle':
      // TODO handle envelope and circle geometry types which exist in elasticsearch but not in geojson
      throw new Error(`Unable to convert ${geoJson.type} geometry to geojson, not supported`);
  }

  return [geoJson];
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
    throw new Error(`Unsupported field type, expected: geo_shape or geo_point, you provided: ${geoFieldType}`);
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
    "type": "polygon",
    "coordinates": [
      [ topLeft, bottomLeft, bottomRight, topRight, topLeft ]
    ]
  };
}

/*
 * Convert map bounds to polygon
 */
export function convertMapExtentToPolygon({ maxLat, maxLon, minLat, minLon }) {
  if (maxLon > 180 && minLon < -180) {
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
