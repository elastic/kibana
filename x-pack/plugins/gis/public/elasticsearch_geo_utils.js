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

export function createExtentFilter(mapExtent, geoFieldName, geoFieldType) {
  // TODO this is not a complete implemenation. Need to handle other cases:
  // 1) bounds are all east of 180
  // 2) bounds are all west of -180
  const noWrapMapExtent = {
    minLon: mapExtent.minLon < -180 ? -180 : mapExtent.minLon,
    minLat: mapExtent.minLat < -90 ? -90 : mapExtent.minLat,
    maxLon: mapExtent.maxLon > 180 ? 180 : mapExtent.maxLon,
    maxLat: mapExtent.maxLat > 90 ? 90 : mapExtent.maxLat,
  };

  if (geoFieldType === 'geo_point') {
    return {
      geo_bounding_box: {
        [geoFieldName]: {
          top_left: {
            lat: noWrapMapExtent.maxLat,
            lon: noWrapMapExtent.minLon
          },
          bottom_right: {
            lat: noWrapMapExtent.minLat,
            lon: noWrapMapExtent.maxLon
          }
        }
      }
    };
  } else if (geoFieldType === 'geo_shape') {
    return {
      geo_shape: {
        [geoFieldName]: {
          shape: {
            type: 'envelope',
            coordinates: [
              [noWrapMapExtent.minLon, noWrapMapExtent.maxLat],
              [noWrapMapExtent.maxLon, noWrapMapExtent.minLat]
            ]
          },
          relation: 'INTERSECTS'
        }
      }
    };
  } else {
    throw new Error(`Unsupported field type, expected: geo_shape or geo_point, you provided: ${geoFieldType}`);
  }
}

/*
 * Convert map bounds to envelope
 * Bounds that cross the dateline are split into 2 envelopes
 */
export function convertMapExtentToEnvelope({ maxLat, maxLon, minLat, minLon }) {
  if (maxLon > 180 && minLon < -180) {
    return convertMapExtentToEnvelope({
      maxLat,
      maxLon: 180,
      minLat,
      minLon: -180,
    });
  }

  if (maxLon > 180) {
    // bounds cross datleine east to west, slit into 2 shapes
    const overlapWestOfDateLine = maxLon - 180;
    return [
      convertMapExtentToEnvelope({
        maxLat,
        maxLon: 180,
        minLat,
        minLon,
      }),
      convertMapExtentToEnvelope({
        maxLat,
        maxLon: -180 + overlapWestOfDateLine,
        minLat,
        minLon: -180,
      }),
    ];
  }

  if (minLon < -180) {
    // bounds cross datleine west to east, slit into 2 shapes
    const overlapEastOfDateLine = Math.abs(minLon) - 180;
    return [
      convertMapExtentToEnvelope({
        maxLat,
        maxLon: 180,
        minLat,
        minLon: 180 - overlapEastOfDateLine,
      }),
      convertMapExtentToEnvelope({
        maxLat,
        maxLon: maxLon,
        minLat,
        minLon: -180,
      }),
    ];
  }

  return {
    "type": "envelope",
    "coordinates": [
      [minLon, maxLat], [maxLon, minLat]
    ]
  };
}
