/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FileBasedFieldVisConfig } from '../../../stats_table/types';
import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';

export function filterFields(
  fields: Array<
    | FileBasedFieldVisConfig
    | {
        fieldName: string;
        type: 'text' | 'unknown';
        stats: { mean: number; count: number; sampleCount: number; cardinality: number };
      }
  >,
  visibleFieldNames: string[],
  visibleFieldTypes: string[]
) {
  let items = fields;

  if (visibleFieldTypes && visibleFieldTypes.length > 0) {
    items = items.filter(
      (config) => visibleFieldTypes.findIndex((field) => field === config.type) > -1
    );
  }
  if (visibleFieldNames && visibleFieldNames.length > 0) {
    items = items.filter((config) => {
      return visibleFieldNames.findIndex((field) => field === config.fieldName) > -1;
    });
  }

  return {
    filteredFields: items,
    visibleFieldsCount: items.length,
    visibleMetricsCount: items.filter((d) => d.type === ML_JOB_FIELD_TYPES.NUMBER).length,
  };
}
