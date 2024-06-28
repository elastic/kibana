/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ISearchOptions } from '@kbn/search-types';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type {
  FieldStatsCommonRequestParams,
  SupportedAggs,
} from '../../../../../common/types/field_stats';
import type { FieldStatsError } from '../../../../../common/types/field_stats';
import type { FieldStats } from '../../../../../common/types/field_stats';
import { SUPPORTED_FIELD_TYPES } from '../../../../../common/constants';
import { fetchDateFieldsStats } from './get_date_field_stats';
import { fetchBooleanFieldsStats } from './get_boolean_field_stats';
import { fetchFieldsExamples } from './get_field_examples';
import { fetchNumericFieldsStats } from './get_numeric_field_stats';
import { fetchStringFieldsStats } from './get_string_field_stats';

export const getFieldsStats = (
  dataSearch: ISearchStart,
  params: FieldStatsCommonRequestParams,
  fields: Array<{
    fieldName: string;
    type: string;
    cardinality: number;
    safeFieldName: string;
    supportedAggs?: SupportedAggs;
  }>,
  options: ISearchOptions
): Observable<FieldStats[] | FieldStatsError> | undefined => {
  const fieldType = fields[0].type;
  switch (fieldType) {
    case SUPPORTED_FIELD_TYPES.NUMBER:
      return fetchNumericFieldsStats(dataSearch, params, fields, options);
    case SUPPORTED_FIELD_TYPES.KEYWORD:
    case SUPPORTED_FIELD_TYPES.IP:
    case SUPPORTED_FIELD_TYPES.VERSION:
      return fetchStringFieldsStats(dataSearch, params, fields, options);
    case SUPPORTED_FIELD_TYPES.DATE:
      return fetchDateFieldsStats(dataSearch, params, fields, options);
    case SUPPORTED_FIELD_TYPES.BOOLEAN:
      return fetchBooleanFieldsStats(dataSearch, params, fields, options);
    case SUPPORTED_FIELD_TYPES.TEXT:
      return fetchFieldsExamples(dataSearch, params, fields, options);
    default:
      // Use an exists filter on the the field name to get
      // examples of the field, so cannot batch up.
      return fetchFieldsExamples(dataSearch, params, fields, options);
  }
};
