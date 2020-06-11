/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { parse } from 'wellknown';
import {
  DECIMAL_DEGREES_PRECISION,
  ES_GEO_FIELD_TYPE,
  ES_SPATIAL_RELATIONS,
  GEO_JSON_TYPE,
  POLYGON_COORDINATES_EXTERIOR_INDEX,
  LON_INDEX,
  LAT_INDEX,
} from '../common/constants';
import { getEsSpatialRelationLabel } from '../common/i18n_getters';
import { SPATIAL_FILTER_TYPE } from './kibana_services';
import turfCircle from '@turf/circle';

function ensureGeoField(type) {
  const expectedTypes = [ES_GEO_FIELD_TYPE.GEO_POINT, ES_GEO_FIELD_TYPE.GEO_SHAPE];
  if (!expectedTypes.includes(type)) {
    const errorMessage = i18n.translate(
      'xpack.maps.es_geo_utils.unsupportedFieldTypeErrorMessage',
      {
        defaultMessage:
          'Unsupported field type, expected: {expectedTypes}, you provided: {fieldType}',
        values: {
          fieldType: type,
          expectedTypes: expectedTypes.join(','),
        },
      }
    );
    throw new Error(errorMessage);
  }
}

function ensureGeometryType(type, expectedTypes) {
  if (!expectedTypes.includes(type)) {
    const errorMessage = i18n.translate(
      'xpack.maps.es_geo_utils.unsupportedGeometryTypeErrorMessage',
      {
        defaultMessage:
          'Unsupported geometry type, expected: {expectedTypes}, you provided: {geometryType}',
        values: {
          geometryType: type,
          expectedTypes: expectedTypes.join(','),
        },
      }
    );
    throw new Error(errorMessage);
  }
}

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
export function hitsToGeoJson(hits, flattenHit, geoFieldName, geoFieldType, epochMillisFields) {
  const features = [];
  const tmpGeometriesAccumulator = [];

  for (let i = 0; i < hits.length; i++) {
    const properties = flattenHit(hits[i]);

    tmpGeometriesAccumulator.length = 0; //truncate accumulator

    ensureGeoField(geoFieldType);
    if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
      geoPointToGeometry(properties[geoFieldName], tmpGeometriesAccumulator);
    } else {
      geoShapeToGeometry(properties[geoFieldName], tmpGeometriesAccumulator);
    }

    // There is a bug in Elasticsearch API where epoch_millis are returned as a string instead of a number
    // https://github.com/elastic/elasticsearch/issues/50622
    // Convert these field values to integers.
    for (let i = 0; i < epochMillisFields.length; i++) {
      const fieldName = epochMillisFields[i];
      if (typeof properties[fieldName] === 'string') {
        properties[fieldName] = parseInt(properties[fieldName]);
      }
    }

    // don't include geometry field value in properties
    delete properties[geoFieldName];

    //create new geojson Feature for every individual geojson geometry.
    for (let j = 0; j < tmpGeometriesAccumulator.length; j++) {
      features.push({
        type: 'Feature',
        geometry: tmpGeometriesAccumulator[j],
        // _id is not unique across Kibana index pattern. Multiple ES indices could have _id collisions
        // Need to prefix with _index to guarantee uniqueness
        id: `${properties._index}:${properties._id}:${j}`,
        properties,
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features: features,
  };
}

// Parse geo_point docvalue_field
// Either
// 1) Array of latLon strings
// 2) latLon string
export function geoPointToGeometry(value, accumulator) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      geoPointToGeometry(value[i], accumulator);
    }
    return;
  }

  const commaSplit = value.split(',');
  const lat = parseFloat(commaSplit[0]);
  const lon = parseFloat(commaSplit[1]);
  accumulator.push({
    type: GEO_JSON_TYPE.POINT,
    coordinates: [lon, lat],
  });
}

export function convertESShapeToGeojsonGeometry(value) {
  const geoJson = {
    type: value.type,
    coordinates: value.coordinates,
  };

  // https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-shape.html#input-structure
  // For some unknown compatibility nightmarish reason, Elasticsearch types are not capitalized the same as geojson types
  // For example: 'LineString' geojson type is 'linestring' in elasticsearch
  // Convert feature types to geojson spec values
  // Sometimes, the type in ES is capitalized correctly. Sometimes it is not. It depends on how the doc was ingested
  // The below is the correction in-place.
  switch (value.type) {
    case 'point':
      geoJson.type = GEO_JSON_TYPE.POINT;
      break;
    case 'linestring':
      geoJson.type = GEO_JSON_TYPE.LINE_STRING;
      break;
    case 'polygon':
      geoJson.type = GEO_JSON_TYPE.POLYGON;
      break;
    case 'multipoint':
      geoJson.type = GEO_JSON_TYPE.MULTI_POINT;
      break;
    case 'multilinestring':
      geoJson.type = GEO_JSON_TYPE.MULTI_LINE_STRING;
      break;
    case 'multipolygon':
      geoJson.type = GEO_JSON_TYPE.MULTI_POLYGON;
      break;
    case 'geometrycollection':
      geoJson.type = GEO_JSON_TYPE.GEOMETRY_COLLECTION;
      break;
    case 'envelope':
    case 'circle':
      const errorMessage = i18n.translate(
        'xpack.maps.es_geo_utils.convert.unsupportedGeometryTypeErrorMessage',
        {
          defaultMessage: `Unable to convert {geometryType} geometry to geojson, not supported`,
          values: {
            geometryType: geoJson.type,
          },
        }
      );
      throw new Error(errorMessage);
  }
  return geoJson;
}

function convertWKTStringToGeojson(value) {
  try {
    return parse(value);
  } catch (e) {
    const errorMessage = i18n.translate('xpack.maps.es_geo_utils.wkt.invalidWKTErrorMessage', {
      defaultMessage: `Unable to convert {wkt} to geojson. Valid WKT expected.`,
      values: {
        wkt: value,
      },
    });
    throw new Error(errorMessage);
  }
}

export function geoShapeToGeometry(value, accumulator) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    // value expressed as an array of values
    for (let i = 0; i < value.length; i++) {
      geoShapeToGeometry(value[i], accumulator);
    }
    return;
  }

  let geoJson;
  if (typeof value === 'string') {
    geoJson = convertWKTStringToGeojson(value);
  } else {
    geoJson = convertESShapeToGeojsonGeometry(value);
  }

  accumulator.push(geoJson);
}

export function makeESBbox({ maxLat, maxLon, minLat, minLon }) {
  const bottom = clampToLatBounds(minLat);
  const top = clampToLatBounds(maxLat);
  let esBbox;
  if (maxLon - minLon >= 360) {
    esBbox = {
      top_left: [-180, top],
      bottom_right: [180, bottom],
    };
  } else {
    // geo_bounding_box does not support ranges outside of -180 and 180
    // When the area crosses the 180° meridian,
    // the value of the lower left longitude will be greater than the value of the upper right longitude.
    // http://docs.opengeospatial.org/is/12-063r5/12-063r5.html#30
    //
    // This ensures bbox goes West->East in the happy case,
    // but will be formatted East->West in case it crosses the date-line
    const newMinlon = ((minLon + 180 + 360) % 360) - 180;
    const newMaxlon = ((maxLon + 180 + 360) % 360) - 180;
    esBbox = {
      top_left: [newMinlon, top],
      bottom_right: [newMaxlon, bottom],
    };
  }

  return esBbox;
}

function createGeoBoundBoxFilter({ maxLat, maxLon, minLat, minLon }, geoFieldName) {
  const boundingBox = makeESBbox({ maxLat, maxLon, minLat, minLon });
  return {
    geo_bounding_box: {
      [geoFieldName]: boundingBox,
    },
  };
}

export function createExtentFilter(mapExtent, geoFieldName, geoFieldType) {
  ensureGeoField(geoFieldType);

  // Extent filters are used to dynamically filter data for the current map view port.
  // Continue to use geo_bounding_box queries for extent filters
  // 1) geo_bounding_box queries are faster than polygon queries
  // 2) geo_shape benefits of pre-indexed shapes and
  // compatability across multi-indices with geo_point and geo_shape do not apply to this use case.
  if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
    return createGeoBoundBoxFilter(mapExtent, geoFieldName);
  }

  return {
    geo_shape: {
      [geoFieldName]: {
        shape: formatEnvelopeAsPolygon(mapExtent),
        relation: ES_SPATIAL_RELATIONS.INTERSECTS,
      },
    },
  };
}

export function createSpatialFilterWithGeometry({
  preIndexedShape,
  geometry,
  geometryLabel,
  indexPatternId,
  geoFieldName,
  geoFieldType,
  relation = ES_SPATIAL_RELATIONS.INTERSECTS,
}) {
  ensureGeoField(geoFieldType);

  const isGeoPoint = geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT;

  const relationLabel = isGeoPoint
    ? i18n.translate('xpack.maps.es_geo_utils.shapeFilter.geoPointRelationLabel', {
        defaultMessage: 'in',
      })
    : getEsSpatialRelationLabel(relation);
  const meta = {
    type: SPATIAL_FILTER_TYPE,
    negate: false,
    index: indexPatternId,
    key: geoFieldName,
    alias: `${geoFieldName} ${relationLabel} ${geometryLabel}`,
  };

  const shapeQuery = {
    // geo_shape query with geo_point field only supports intersects relation
    relation: isGeoPoint ? ES_SPATIAL_RELATIONS.INTERSECTS : relation,
  };

  if (preIndexedShape) {
    shapeQuery.indexed_shape = preIndexedShape;
  } else {
    shapeQuery.shape = geometry;
  }

  return {
    meta,
    geo_shape: {
      ignore_unmapped: true,
      [geoFieldName]: shapeQuery,
    },
  };
}

export function createDistanceFilterWithMeta({
  alias,
  distanceKm,
  geoFieldName,
  indexPatternId,
  point,
}) {
  const meta = {
    type: SPATIAL_FILTER_TYPE,
    negate: false,
    index: indexPatternId,
    key: geoFieldName,
    alias: alias
      ? alias
      : i18n.translate('xpack.maps.es_geo_utils.distanceFilterAlias', {
          defaultMessage: '{geoFieldName} within {distanceKm}km of {pointLabel}',
          values: {
            distanceKm,
            geoFieldName,
            pointLabel: point.join(', '),
          },
        }),
  };

  return {
    geo_distance: {
      distance: `${distanceKm}km`,
      [geoFieldName]: point,
    },
    meta,
  };
}

export function roundCoordinates(coordinates) {
  for (let i = 0; i < coordinates.length; i++) {
    const value = coordinates[i];
    if (Array.isArray(value)) {
      roundCoordinates(value);
    } else if (!isNaN(value)) {
      coordinates[i] = _.round(value, DECIMAL_DEGREES_PRECISION);
    }
  }
}

/*
 * returns Polygon geometry where coordinates define a bounding box that contains the input geometry
 */
export function getBoundingBoxGeometry(geometry) {
  ensureGeometryType(geometry.type, [GEO_JSON_TYPE.POLYGON]);

  const exterior = geometry.coordinates[POLYGON_COORDINATES_EXTERIOR_INDEX];
  const extent = {
    minLon: exterior[0][LON_INDEX],
    minLat: exterior[0][LAT_INDEX],
    maxLon: exterior[0][LON_INDEX],
    maxLat: exterior[0][LAT_INDEX],
  };
  for (let i = 1; i < exterior.length; i++) {
    extent.minLon = Math.min(exterior[i][LON_INDEX], extent.minLon);
    extent.minLat = Math.min(exterior[i][LAT_INDEX], extent.minLat);
    extent.maxLon = Math.max(exterior[i][LON_INDEX], extent.maxLon);
    extent.maxLat = Math.max(exterior[i][LAT_INDEX], extent.maxLat);
  }

  return formatEnvelopeAsPolygon(extent);
}

export function formatEnvelopeAsPolygon({ maxLat, maxLon, minLat, minLon }) {
  // GeoJSON mandates that the outer polygon must be counterclockwise to avoid ambiguous polygons
  // when the shape crosses the dateline
  const left = minLon;
  const right = maxLon;
  const top = clampToLatBounds(maxLat);
  const bottom = clampToLatBounds(minLat);
  const topLeft = [left, top];
  const bottomLeft = [left, bottom];
  const bottomRight = [right, bottom];
  const topRight = [right, top];
  return {
    type: GEO_JSON_TYPE.POLYGON,
    coordinates: [[topLeft, bottomLeft, bottomRight, topRight, topLeft]],
  };
}

export function clampToLatBounds(lat) {
  return clamp(lat, -89, 89);
}

export function clampToLonBounds(lon) {
  return clamp(lon, -180, 180);
}

export function clamp(val, min, max) {
  if (val > max) {
    return max;
  } else if (val < min) {
    return min;
  } else {
    return val;
  }
}

export function extractFeaturesFromFilters(filters) {
  const features = [];
  filters
    .filter((filter) => {
      return filter.meta.key && filter.meta.type === SPATIAL_FILTER_TYPE;
    })
    .forEach((filter) => {
      let geometry;
      if (filter.geo_distance && filter.geo_distance[filter.meta.key]) {
        const distanceSplit = filter.geo_distance.distance.split('km');
        const distance = parseFloat(distanceSplit[0]);
        const circleFeature = turfCircle(filter.geo_distance[filter.meta.key], distance);
        geometry = circleFeature.geometry;
      } else if (
        filter.geo_shape &&
        filter.geo_shape[filter.meta.key] &&
        filter.geo_shape[filter.meta.key].shape
      ) {
        geometry = filter.geo_shape[filter.meta.key].shape;
      } else {
        // do not know how to convert spatial filter to geometry
        // this includes pre-indexed shapes
        return;
      }

      features.push({
        type: 'Feature',
        geometry,
        properties: {
          filter: filter.meta.alias,
        },
      });
    });

  return features;
}
