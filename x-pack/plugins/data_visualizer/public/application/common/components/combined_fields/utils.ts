/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import uuid from 'uuid/v4';
import { CombinedField } from './types';
import type {
  FindFileStructureResponse,
  IngestPipeline,
  Mappings,
} from '../../../../../../file_upload/common';

const COMMON_LAT_NAMES = ['latitude', 'lat'];
const COMMON_LON_NAMES = ['longitude', 'long', 'lon'];

export function getDefaultCombinedFields(results: FindFileStructureResponse) {
  const combinedFields: CombinedField[] = [];
  const geoPointField = getGeoPointField(results);
  if (geoPointField) {
    combinedFields.push(geoPointField);
  }
  return combinedFields;
}

export function addCombinedFieldsToMappings(
  mappings: Mappings,
  combinedFields: CombinedField[]
): Mappings {
  const updatedMappings = { ...mappings };
  combinedFields.forEach((combinedField) => {
    updatedMappings.properties[combinedField.combinedFieldName] = {
      type: combinedField.mappingType,
    };
  });
  return updatedMappings;
}

export function removeCombinedFieldsFromMappings(
  mappings: Mappings,
  combinedFields: CombinedField[]
) {
  const updatedMappings = { ...mappings };
  combinedFields.forEach((combinedField) => {
    delete updatedMappings.properties[combinedField.combinedFieldName];
  });
  return updatedMappings;
}

export function addCombinedFieldsToPipeline(
  pipeline: IngestPipeline,
  combinedFields: CombinedField[]
) {
  const updatedPipeline = cloneDeep(pipeline);
  combinedFields.forEach((combinedField) => {
    updatedPipeline.processors.push({
      set: {
        field: combinedField.combinedFieldName,
        value: combinedField.fieldNames
          .map((fieldName) => {
            return `{{${fieldName}}}`;
          })
          .join(combinedField.delimiter),
      },
    });
  });
  return updatedPipeline;
}

export function removeCombinedFieldsFromPipeline(
  pipeline: IngestPipeline,
  combinedFields: CombinedField[]
) {
  return {
    ...pipeline,
    processors: pipeline.processors.filter((processor) => {
      return 'set' in processor
        ? !combinedFields.some((combinedField) => {
            return processor.set.field === combinedField.combinedFieldName;
          })
        : true;
    }),
  };
}

export function isWithinLatRange(
  fieldName: string,
  fieldStats: FindFileStructureResponse['field_stats']
) {
  return (
    fieldName in fieldStats &&
    'max_value' in fieldStats[fieldName] &&
    fieldStats[fieldName]!.max_value! <= 90 &&
    'min_value' in fieldStats[fieldName] &&
    fieldStats[fieldName]!.min_value! >= -90
  );
}

export function isWithinLonRange(
  fieldName: string,
  fieldStats: FindFileStructureResponse['field_stats']
) {
  return (
    fieldName in fieldStats &&
    'max_value' in fieldStats[fieldName] &&
    fieldStats[fieldName]!.max_value! <= 180 &&
    'min_value' in fieldStats[fieldName] &&
    fieldStats[fieldName]!.min_value! >= -180
  );
}

export function createGeoPointCombinedField(
  latField: string,
  lonField: string,
  geoPointField: string
): CombinedField {
  return {
    mappingType: 'geo_point',
    delimiter: ',',
    combinedFieldName: geoPointField,
    fieldNames: [latField, lonField],
  };
}

export function getNameCollisionMsg(name: string) {
  return i18n.translate('xpack.dataVisualizer.nameCollisionMsg', {
    defaultMessage: '"{name}" already exists, please provide a unique name',
    values: { name },
  });
}

export function getFieldNames(results: FindFileStructureResponse): string[] {
  return results.column_names !== undefined
    ? results.column_names
    : Object.keys(results.field_stats);
}

function getGeoPointField(results: FindFileStructureResponse) {
  const fieldNames = getFieldNames(results);

  const latField = fieldNames.find((columnName) => {
    return (
      COMMON_LAT_NAMES.includes(columnName.toLowerCase()) &&
      isWithinLatRange(columnName, results.field_stats)
    );
  });

  const lonField = fieldNames.find((columnName) => {
    return (
      COMMON_LON_NAMES.includes(columnName.toLowerCase()) &&
      isWithinLonRange(columnName, results.field_stats)
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
    return !fieldNames.includes(name);
  });

  return geoPointField ? createGeoPointCombinedField(latField, lonField, geoPointField) : null;
}
