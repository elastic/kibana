/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

import { newJobCapsService } from '../../services/new_job_capabilities_service';

import { getDefaultFieldsFromJobCaps, DataFrameAnalyticsConfig } from '../common';

export interface FieldTypes {
  [key: string]: ES_FIELD_TYPES;
}

export const getIndexFields = (
  jobConfig: DataFrameAnalyticsConfig | undefined,
  needsDestIndexFields: boolean
) => {
  const { fields } = newJobCapsService;
  if (jobConfig !== undefined) {
    const { selectedFields: defaultSelected, docFields } = getDefaultFieldsFromJobCaps(
      fields,
      jobConfig,
      needsDestIndexFields
    );

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
