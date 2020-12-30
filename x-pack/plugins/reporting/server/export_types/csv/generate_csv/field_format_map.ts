/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { FieldFormat } from 'src/plugins/data/common';
import { FieldFormatConfig, IFieldFormatsRegistry } from 'src/plugins/data/server';
import { IndexPatternSavedObject } from '../types';

/**
 *  Create a map of FieldFormat instances for index pattern fields
 *
 *  @param {Object} indexPatternSavedObject
 *  @param {FieldFormatsService} fieldFormats
 *  @return {Map} key: field name, value: FieldFormat instance
 */
export function fieldFormatMapFactory(
  indexPatternSavedObject: IndexPatternSavedObject,
  fieldFormatsRegistry: IFieldFormatsRegistry,
  timezone: string | undefined
) {
  const formatsMap = new Map<string, FieldFormat>();

  // From here, the browser timezone can't be determined, so we accept a
  // timezone field from job params posted to the API. Here is where it gets used.
  const serverDateParams = { timezone };

  // Add FieldFormat instances for fields with custom formatters
  if (_.has(indexPatternSavedObject, 'attributes.fieldFormatMap')) {
    const fieldFormatMap = JSON.parse(indexPatternSavedObject.attributes.fieldFormatMap);
    Object.keys(fieldFormatMap).forEach((fieldName) => {
      const formatConfig: FieldFormatConfig = fieldFormatMap[fieldName];
      const formatParams = {
        ...formatConfig.params,
        ...serverDateParams,
      };

      if (!_.isEmpty(formatConfig)) {
        formatsMap.set(fieldName, fieldFormatsRegistry.getInstance(formatConfig.id, formatParams));
      }
    });
  }

  // Add default FieldFormat instances for non-custom formatted fields
  const indexFields = JSON.parse(_.get(indexPatternSavedObject, 'attributes.fields', '[]'));
  indexFields.forEach((field: any) => {
    if (!formatsMap.has(field.name)) {
      formatsMap.set(
        field.name,
        fieldFormatsRegistry.getDefaultInstance(field.type, [], serverDateParams)
      );
    }
  });

  return formatsMap;
}
