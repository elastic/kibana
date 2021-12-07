/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type { DataView, KBN_FIELD_TYPES } from 'src/plugins/data/common';
import {
  FieldFormat,
  IFieldFormatsRegistry,
  FieldFormatConfig,
} from 'src/plugins/field_formats/common';
/**
 *  Create a map of FieldFormat instances for index pattern fields
 *
 *  @param {DataView} dataView
 *  @param {FieldFormatsService} fieldFormats
 *  @return {Map} key: field name, value: FieldFormat instance
 */
export function fieldFormatMapFactory(
  dataView: DataView | undefined,
  fieldFormatsRegistry: IFieldFormatsRegistry,
  timezone: string | undefined
) {
  const formatsMap = new Map<string, FieldFormat>();

  // From here, the browser timezone can't be determined, so we accept a
  // timezone field from job params posted to the API. Here is where it gets used.
  const serverDateParams = { timezone };

  // Add FieldFormat instances for fields with custom formatters
  if (dataView) {
    Object.keys(dataView.fieldFormatMap).forEach((fieldName) => {
      const formatConfig: FieldFormatConfig = dataView.fieldFormatMap[fieldName];
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
  dataView?.fields.forEach((field) => {
    if (!formatsMap.has(field.name)) {
      formatsMap.set(
        field.name,
        fieldFormatsRegistry.getDefaultInstance(field.type as KBN_FIELD_TYPES, [], serverDateParams)
      );
    }
  });

  return formatsMap;
}
