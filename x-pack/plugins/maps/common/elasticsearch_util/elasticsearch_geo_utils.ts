/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { Feature, FeatureCollection, Geometry, Polygon, Point, Position } from 'geojson';
import { BBox } from '@turf/helpers';
import {
  DECIMAL_DEGREES_PRECISION,
  ES_GEO_FIELD_TYPE,
  GEO_JSON_TYPE,
  POLYGON_COORDINATES_EXTERIOR_INDEX,
  LON_INDEX,
  LAT_INDEX,
} from '../constants';
import { MapExtent } from '../descriptor_types';
import { Coordinates, ESBBox, ESGeometry } from './types';

function ensureGeoField(type: string) {
  const expectedTypes = [ES_GEO_FIELD_TYPE.GEO_POINT, ES_GEO_FIELD_TYPE.GEO_SHAPE];
  if (!expectedTypes.includes(type as ES_GEO_FIELD_TYPE)) {
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

function ensureGeometryType(type: string, expectedTypes: GEO_JSON_TYPE[]) {
  if (!expectedTypes.includes(type as GEO_JSON_TYPE)) {
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
export function hitsToGeoJson(
  hits: Array<Record<string, unknown>>,
  flattenHit: (elasticSearchHit: Record<string, unknown>) => Record<string, unknown>,
  geoFieldName: string,
  geoFieldType: ES_GEO_FIELD_TYPE,
  epochMillisFields: string[]
): FeatureCollection {
  const features: Feature[] = [];
  const tmpGeometriesAccumulator: Geometry[] = [];

  for (let i = 0; i < hits.length; i++) {
    // flattenHit returns value from cache. Create new object to avoid modifying flattenHit cache.
    // not doing deep copy because copying coordinates can be very expensive for complex geometries.
    const properties = { ...flattenHit(hits[i]) };

    tmpGeometriesAccumulator.length = 0; // truncate accumulator

    ensureGeoField(geoFieldType);
    if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
      geoPointToGeometry(
        properties[geoFieldName] as Point | Point[] | undefined,
        tmpGeometriesAccumulator
      );
    } else {
      geoShapeToGeometry(
        properties[geoFieldName] as ESGeometry | ESGeometry[] | undefined,
        tmpGeometriesAccumulator
      );
    }

    // There is a bug in Elasticsearch API where epoch_millis are returned as a string instead of a number
    // https://github.com/elastic/elasticsearch/issues/50622
    // Convert these field values to integers.
    for (let k = 0; k < epochMillisFields.length; k++) {
      const fieldName = epochMillisFields[k];
      if (typeof properties[fieldName] === 'string') {
        properties[fieldName] = parseInt(properties[fieldName] as string, 10);
      }
    }

    // don't include geometry field value in properties
    delete properties[geoFieldName];

    // create new geojson Feature for every individual geojson geometry.
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
    features,
  };
}

// Parse geo_point fields API response
export function geoPointToGeometry(
  value: Point[] | Point | undefined,
  accumulator: Geometry[]
): void {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      geoPointToGeometry(value[i], accumulator);
    }
    return;
  }

  accumulator.push(value as Point);
}

// Parse geo_shape fields API response
export function geoShapeToGeometry(
  value: ESGeometry | ESGeometry[] | undefined,
  accumulator: Geometry[]
): void {
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

  if (value.type.toLowerCase() === GEO_JSON_TYPE.GEOMETRY_COLLECTION.toLowerCase()) {
    const geometryCollection = value as unknown as { geometries: ESGeometry[] };
    for (let i = 0; i < geometryCollection.geometries.length; i++) {
      geoShapeToGeometry(geometryCollection.geometries[i], accumulator);
    }
    return;
  }

  // fields API does not return true geojson yet, circle and envelope still exist which are not part of geojson spec
  if (value.type.toLowerCase() === 'envelope') {
    const envelopeCoords = value.coordinates as Position[];
    // format defined here https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-shape.html#_envelope
    const polygon = formatEnvelopeAsPolygon({
      minLon: envelopeCoords[0][0],
      maxLon: envelopeCoords[1][0],
      minLat: envelopeCoords[1][1],
      maxLat: envelopeCoords[0][1],
    });
    accumulator.push(polygon);
  } else if (value.type.toLowerCase() === 'circle') {
    const errorMessage = i18n.translate(
      'xpack.maps.es_geo_utils.convert.unsupportedGeometryTypeErrorMessage',
      {
        defaultMessage: `Unable to convert {geometryType} geometry to geojson, not supported`,
        values: {
          geometryType: value.type,
        },
      }
    );
    throw new Error(errorMessage);
  } else {
    accumulator.push(value as Geometry);
  }
}

export function makeESBbox({ maxLat, maxLon, minLat, minLon }: MapExtent): ESBBox {
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

export function roundCoordinates(coordinates: Coordinates): void {
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
export function getBoundingBoxGeometry(geometry: Geometry): Polygon {
  ensureGeometryType(geometry.type, [GEO_JSON_TYPE.POLYGON]);

  const exterior = (geometry as Polygon).coordinates[POLYGON_COORDINATES_EXTERIOR_INDEX];
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

export function formatEnvelopeAsPolygon({ maxLat, maxLon, minLat, minLon }: MapExtent): Polygon {
  // GeoJSON mandates that the outer polygon must be counterclockwise to avoid ambiguous polygons
  // when the shape crosses the dateline
  const lonDelta = maxLon - minLon;
  const left = lonDelta > 360 ? -180 : minLon;
  const right = lonDelta > 360 ? 180 : maxLon;
  const top = clampToLatBounds(maxLat);
  const bottom = clampToLatBounds(minLat);
  const topLeft = [left, top] as Position;
  const bottomLeft = [left, bottom] as Position;
  const bottomRight = [right, bottom] as Position;
  const topRight = [right, top] as Position;
  return {
    type: GEO_JSON_TYPE.POLYGON,
    coordinates: [[topLeft, bottomLeft, bottomRight, topRight, topLeft]],
  } as Polygon;
}

export function clampToLatBounds(lat: number): number {
  return clamp(lat, -89, 89);
}

export function clampToLonBounds(lon: number): number {
  return clamp(lon, -180, 180);
}

export function clamp(val: number, min: number, max: number): number {
  if (val > max) {
    return max;
  } else if (val < min) {
    return min;
  } else {
    return val;
  }
}

export function scaleBounds(bounds: MapExtent, scaleFactor: number): MapExtent {
  const width = bounds.maxLon - bounds.minLon;
  const height = bounds.maxLat - bounds.minLat;

  const newMinLon = bounds.minLon - width * scaleFactor;
  const nexMaxLon = bounds.maxLon + width * scaleFactor;

  const lonDelta = nexMaxLon - newMinLon;
  const left = lonDelta > 360 ? -180 : newMinLon;
  const right = lonDelta > 360 ? 180 : nexMaxLon;

  return {
    minLon: left,
    minLat: clampToLatBounds(bounds.minLat - height * scaleFactor),
    maxLon: right,
    maxLat: clampToLonBounds(bounds.maxLat + height * scaleFactor),
  };
}

export function turfBboxToBounds(turfBbox: BBox): MapExtent {
  return {
    minLon: turfBbox[0],
    minLat: turfBbox[1],
    maxLon: turfBbox[2],
    maxLat: turfBbox[3],
  };
}
