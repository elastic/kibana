/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import {
  FieldStats,
  FieldStatsError,
  isValidField,
  FieldStatsCommonRequestParams,
} from '../../../../../common/types/field_stats';
import { fetchNumericFieldStats } from './get_numeric_field_stats';
import { fetchStringFieldStats } from './get_string_field_stats';
import { fetchDateFieldStats } from './get_date_field_stats';
import { fetchBooleanFieldStats } from './get_boolean_field_stats';
import { fetchFieldExamples } from './get_field_examples';
import { JOB_FIELD_TYPES } from '../../../../../common';
import { ISearchOptions } from '../../../../../../../../src/plugins/data/common';
import { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';

export const getFieldStats = (
  dataPlugin: DataPublicPluginStart,
  params: FieldStatsCommonRequestParams,
  field: {
    fieldName: string;
    type: string;
    cardinality: number;
    safeFieldName: string;
  },
  options: ISearchOptions
): Observable<FieldStats | FieldStatsError> | undefined => {
  // An invalid field with undefined fieldName is used for a document count request.
  if (!isValidField(field)) return;

  switch (field.type) {
    case JOB_FIELD_TYPES.NUMBER:
      return fetchNumericFieldStats(dataPlugin, params, field, options);
    case JOB_FIELD_TYPES.KEYWORD:
      // case JOB_FIELD_TYPES.IP:
      return fetchStringFieldStats(dataPlugin, params, field, options);
    case JOB_FIELD_TYPES.DATE:
      return fetchDateFieldStats(dataPlugin, params, field, options);
    case JOB_FIELD_TYPES.BOOLEAN:
      return fetchBooleanFieldStats(dataPlugin, params, field, options);
    case JOB_FIELD_TYPES.TEXT:
      return fetchFieldExamples(dataPlugin, params, field, options);
    case JOB_FIELD_TYPES.IP:
      return fetchStringFieldStats(dataPlugin, params, field, options);
    default:
      // Use an exists filter on the the field name to get
      // examples of the field, so cannot batch up.
      return fetchFieldExamples(dataPlugin, params, field, options);
  }
};
