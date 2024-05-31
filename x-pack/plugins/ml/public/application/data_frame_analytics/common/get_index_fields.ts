/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ES_FIELD_TYPES } from '@kbn/field-types';

import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import { newJobCapsServiceAnalytics } from '../../services/new_job_capabilities/new_job_capabilities_service_analytics';

export interface FieldTypes {
  [key: string]: ES_FIELD_TYPES;
}

export const getIndexFields = (
  jobConfig: DataFrameAnalyticsConfig | undefined,
  needsDestIndexFields: boolean
) => {
  if (jobConfig !== undefined) {
    const { selectedFields: defaultSelected, docFields } =
      newJobCapsServiceAnalytics.getDefaultFields(jobConfig, needsDestIndexFields);

    const types: FieldTypes = {};
    const allFields: string[] = [];

    docFields.forEach((field) => {
      types[field.id] = field.type;
      allFields.push(field.id);
    });

    return {
      defaultSelectedFields: defaultSelected.map((field) => field.id),
      fieldTypes: types,
      tableFields: allFields,
    };
  } else {
    return {
      defaultSelectedFields: [],
      fieldTypes: {},
      tableFields: [],
    };
  }
};
