/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import uuid from 'uuid/v4';
import { CombinedField, COMBINED_FIELD_TYPES } from './types';

const COMMON_LAT_NAMES = ['latitude', 'lat'];
const COMMON_LON_NAMES = ['longitude', 'long', 'lon'];

export function getDefaultCombinedFields(results: unknown) {
  const combinedFields: CombinedField[] = [];
  const geoPointField = getGeoPointField(results);
  if (geoPointField) {
    combinedFields.push(geoPointField);
  }
  return combinedFields;
}

export function isGeoPointCombinedField(combinedField: CombinedField) {
  return (
    combinedField.type === COMBINED_FIELD_TYPES.GEO_POINT && combinedField.fieldNames.length === 2
  );
}

export function addCombinedFieldsToMappings(mappings: unknown, combinedFields: CombinedField[]) {
  const updatedMappings = { ...mappings };
  combinedFields.forEach((combinedField) => {
    if (isGeoPointCombinedField(combinedField)) {
      updatedMappings[combinedField.combinedFieldName] = { type: 'geo_point' };
    }
  });
  return updatedMappings;
}

export function addCombinedFieldsToPipeline(pipeline: unknown, combinedFields: CombinedField[]) {
  const updatedPipeline = _.cloneDeep(pipeline);
  combinedFields.forEach((combinedField) => {
    if (isGeoPointCombinedField(combinedField)) {
      updatedPipeline.processors.push({
        set: {
          field: combinedField.combinedFieldName,
          value: `{{${combinedField.fieldNames[0]}}},{{${combinedField.fieldNames[1]}}}`,
        },
      });
    }
  });
  return updatedPipeline;
}

export function isWithinLatRange(fieldName: string, fieldStats: unknown) {
  return (
    fieldStats.hasOwnProperty(fieldName) &&
    fieldStats[fieldName].hasOwnProperty('max_value') &&
    fieldStats[fieldName].max_value <= 90 &&
    fieldStats[fieldName].hasOwnProperty('min_value') &&
    fieldStats[fieldName].min_value >= -90
  );
}

export function isWithinLonRange(fieldName: string, fieldStats: unknown) {
  return (
    fieldStats.hasOwnProperty(fieldName) &&
    fieldStats[fieldName].hasOwnProperty('max_value') &&
    fieldStats[fieldName].max_value <= 180 &&
    fieldStats[fieldName].hasOwnProperty('min_value') &&
    fieldStats[fieldName].min_value >= -180
  );
}

export function createGeoPointCombinedField(
  latField: string,
  lonField: string,
  geoPointField: string
): CombinedField {
  return {
    type: COMBINED_FIELD_TYPES.GEO_POINT,
    combinedFieldName: geoPointField,
    fieldNames: [latField, lonField],
  };
}

function getGeoPointField(results: unknown) {
  const latField = results.column_names.find((columnName) => {
    return (
      COMMON_LAT_NAMES.includes(columnName) && isWithinLatRange(columnName, results.field_stats)
    );
  });

  const lonField = results.column_names.find((columnName) => {
    return (
      COMMON_LON_NAMES.includes(columnName) && isWithinLonRange(columnName, results.field_stats)
    );
  });

  if (!latField || !lonField) {
    return null;
  }

  const combinedFieldNames = [
    'location',
    'point_location',
    `${latField}_${lonField}`,
    `location_${uuid()}`,
  ];
  // Use first combinedFieldNames that does not have a naming collision
  const geoPointField = combinedFieldNames.find((name) => {
    return !results.column_names.includes(name);
  });

  return createGeoPointCombinedField(latField, lonField, geoPointField);
}
