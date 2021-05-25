/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
// @ts-expect-error
import { parse } from 'wellknown';
// @ts-expect-error
import turfCircle from '@turf/circle';
import { Feature, FeatureCollection, Geometry, Polygon, Point, Position } from 'geojson';
import { BBox } from '@turf/helpers';
import {
  DECIMAL_DEGREES_PRECISION,
  ES_GEO_FIELD_TYPE,
  ES_SPATIAL_RELATIONS,
  GEO_JSON_TYPE,
  POLYGON_COORDINATES_EXTERIOR_INDEX,
  LON_INDEX,
  LAT_INDEX,
} from '../constants';
import { getEsSpatialRelationLabel } from '../i18n_getters';
import { Filter, FilterMeta, FILTERS } from '../../../../../src/plugins/data/common';
import { MapExtent } from '../descriptor_types';

const SPATIAL_FILTER_TYPE = FILTERS.SPATIAL_FILTER;

type Coordinates = Position | Position[] | Position[][] | Position[][][];

// Elasticsearch stores more then just GeoJSON.
// 1) geometry.type as lower case string
// 2) circle and envelope types
interface ESGeometry {
  type: string;
  coordinates: Coordinates;
}

export interface ESBBox {
  top_left: number[];
  bottom_right: number[];
}

interface GeoShapeQueryBody {
  shape?: Polygon;
  relation?: ES_SPATIAL_RELATIONS;
  indexed_shape?: PreIndexedShape;
}

// Index signature explicitly states that anything stored in an object using a string conforms to the structure
// problem is that Elasticsearch signature also allows for other string keys to conform to other structures, like 'ignore_unmapped'
// Use intersection type to exclude certain properties from the index signature
// https://basarat.gitbook.io/typescript/type-system/index-signatures#excluding-certain-properties-from-the-index-signature
type GeoShapeQuery = { ignore_unmapped: boolean } & { [geoFieldName: string]: GeoShapeQueryBody };

export type GeoFilter = Filter & {
  geo_bounding_box?: {
    [geoFieldName: string]: ESBBox;
  };
  geo_distance?: {
    distance: string;
    [geoFieldName: string]: Position | { lat: number; lon: number } | string;
  };
  geo_shape?: GeoShapeQuery;
};

export interface PreIndexedShape {
  index: string;
  id: string | number;
  path: string;
}

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
    const properties = flattenHit(hits[i]);

    tmpGeometriesAccumulator.length = 0; // truncate accumulator

    ensureGeoField(geoFieldType);
    if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
      geoPointToGeometry(
        properties[geoFieldName] as string | string[] | undefined,
        tmpGeometriesAccumulator
      );
    } else {
      geoShapeToGeometry(
        properties[geoFieldName] as string | string[] | ESGeometry | ESGeometry[] | undefined,
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

// Parse geo_point docvalue_field
// Either
// 1) Array of latLon strings
// 2) latLon string
export function geoPointToGeometry(
  value: string[] | string | undefined,
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

  const commaSplit = value.split(',');
  const lat = parseFloat(commaSplit[0]);
  const lon = parseFloat(commaSplit[1]);
  accumulator.push({
    type: GEO_JSON_TYPE.POINT,
    coordinates: [lon, lat],
  } as Point);
}

export function convertESShapeToGeojsonGeometry(value: ESGeometry): Geometry {
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
    case GEO_JSON_TYPE.GEOMETRY_COLLECTION:
      // PEBKAC - geometry-collections need to be unrolled to their individual geometries first.
      const invalidGeometrycollectionError = i18n.translate(
        'xpack.maps.es_geo_utils.convert.invalidGeometryCollectionErrorMessage',
        {
          defaultMessage: `Should not pass GeometryCollection to convertESShapeToGeojsonGeometry`,
        }
      );
      throw new Error(invalidGeometrycollectionError);
    case 'envelope':
      const envelopeCoords = geoJson.coordinates as Position[];
      // format defined here https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-shape.html#_envelope
      const polygon = formatEnvelopeAsPolygon({
        minLon: envelopeCoords[0][0],
        maxLon: envelopeCoords[1][0],
        minLat: envelopeCoords[1][1],
        maxLat: envelopeCoords[0][1],
      });
      geoJson.type = polygon.type;
      geoJson.coordinates = polygon.coordinates;
      break;
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
  return (geoJson as unknown) as Geometry;
}

function convertWKTStringToGeojson(value: string): Geometry {
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

export function geoShapeToGeometry(
  value: string | ESGeometry | string[] | ESGeometry[] | undefined,
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

  if (typeof value === 'string') {
    const geoJson = convertWKTStringToGeojson(value);
    accumulator.push(geoJson);
  } else if (
    // Needs to deal with possible inconsistencies in capitalization
    value.type === GEO_JSON_TYPE.GEOMETRY_COLLECTION ||
    value.type === 'geometrycollection'
  ) {
    const geometryCollection = (value as unknown) as { geometries: ESGeometry[] };
    for (let i = 0; i < geometryCollection.geometries.length; i++) {
      geoShapeToGeometry(geometryCollection.geometries[i], accumulator);
    }
  } else {
    const geoJson = convertESShapeToGeojsonGeometry(value);
    accumulator.push(geoJson);
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

export function createExtentFilter(mapExtent: MapExtent, geoFieldName: string): GeoFilter {
  return {
    geo_bounding_box: {
      [geoFieldName]: makeESBbox(mapExtent),
    },
    meta: {
      alias: null,
      disabled: false,
      negate: false,
      key: geoFieldName,
    },
  };
}

export function createSpatialFilterWithGeometry({
  preIndexedShape,
  geometry,
  geometryLabel,
  indexPatternId,
  geoFieldName,
  relation = ES_SPATIAL_RELATIONS.INTERSECTS,
}: {
  preIndexedShape?: PreIndexedShape | null;
  geometry: Polygon;
  geometryLabel: string;
  indexPatternId: string;
  geoFieldName: string;
  relation: ES_SPATIAL_RELATIONS;
}): GeoFilter {
  const meta: FilterMeta = {
    type: SPATIAL_FILTER_TYPE,
    negate: false,
    index: indexPatternId,
    key: geoFieldName,
    alias: `${geoFieldName} ${getEsSpatialRelationLabel(relation)} ${geometryLabel}`,
    disabled: false,
  };

  const shapeQuery: GeoShapeQueryBody = {
    relation,
  };
  if (preIndexedShape) {
    shapeQuery.indexed_shape = preIndexedShape;
  } else {
    shapeQuery.shape = geometry;
  }

  return {
    meta,
    // Currently no way to create an object with exclude property from index signature
    // typescript error for "ignore_unmapped is not assignable to type 'GeoShapeQueryBody'" expected"
    // @ts-expect-error
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
}: {
  alias: string;
  distanceKm: number;
  geoFieldName: string;
  indexPatternId: string;
  point: Position;
}): GeoFilter {
  const meta: FilterMeta = {
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
    disabled: false,
  };

  return {
    geo_distance: {
      distance: `${distanceKm}km`,
      [geoFieldName]: point,
    },
    meta,
  };
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

export function extractFeaturesFromFilters(filters: GeoFilter[]): Feature[] {
  const features: Feature[] = [];
  filters
    .filter((filter) => {
      return filter.meta.key && filter.meta.type === SPATIAL_FILTER_TYPE;
    })
    .forEach((filter) => {
      const geoFieldName = filter.meta.key!;
      let geometry;
      if (filter.geo_distance && filter.geo_distance[geoFieldName]) {
        const distanceSplit = filter.geo_distance.distance.split('km');
        const distance = parseFloat(distanceSplit[0]);
        const circleFeature = turfCircle(filter.geo_distance[geoFieldName], distance);
        geometry = circleFeature.geometry;
      } else if (
        filter.geo_shape &&
        filter.geo_shape[geoFieldName] &&
        filter.geo_shape[geoFieldName].shape
      ) {
        geometry = filter.geo_shape[geoFieldName].shape;
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

export function scaleBounds(bounds: MapExtent, scaleFactor: number): MapExtent {
  const width = bounds.maxLon - bounds.minLon;
  const height = bounds.maxLat - bounds.minLat;
  return {
    minLon: bounds.minLon - width * scaleFactor,
    minLat: bounds.minLat - height * scaleFactor,
    maxLon: bounds.maxLon + width * scaleFactor,
    maxLat: bounds.maxLat + height * scaleFactor,
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
