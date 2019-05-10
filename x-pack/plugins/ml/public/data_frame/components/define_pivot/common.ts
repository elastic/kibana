/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBoxOptionProps } from '@elastic/eui';

import { StaticIndexPattern } from 'ui/index_patterns';

import { KBN_FIELD_TYPES } from '../../../../common/constants/field_types';

import {
  DataFramePreviewRequest,
  DropDownLabel,
  DropDownOption,
  FieldName,
  PivotAggsConfigDict,
  pivotAggsFieldSupport,
  PivotGroupByConfigDict,
  pivotGroupByFieldSupport,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../common';

export interface Field {
  name: FieldName;
  type: KBN_FIELD_TYPES;
}

function getDefaultGroupByConfig(
  aggName: string,
  fieldName: FieldName,
  groupByAgg: PIVOT_SUPPORTED_GROUP_BY_AGGS
) {
  switch (groupByAgg) {
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS:
      return {
        agg: groupByAgg,
        aggName,
        field: fieldName,
      };
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM:
      return {
        agg: groupByAgg,
        aggName,
        field: fieldName,
        interval: '10',
      };
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM:
      return {
        agg: groupByAgg,
        aggName,
        field: fieldName,
        interval: '1m',
      };
  }
}

export function getPivotDropdownOptions(indexPattern: StaticIndexPattern) {
  // The available group by options
  const groupByOptions: EuiComboBoxOptionProps[] = [];
  const groupByOptionsData: PivotGroupByConfigDict = {};

  // The available aggregations
  const aggOptions: EuiComboBoxOptionProps[] = [];
  const aggOptionsData: PivotAggsConfigDict = {};

  const ignoreFieldNames = ['_id', '_index', '_type'];
  const fields = indexPattern.fields
    .filter(field => field.aggregatable === true && !ignoreFieldNames.includes(field.name))
    .map((field): Field => ({ name: field.name, type: field.type as KBN_FIELD_TYPES }));

  fields.forEach(field => {
    // Group by
    const availableGroupByAggs = pivotGroupByFieldSupport[field.type];
    availableGroupByAggs.forEach(groupByAgg => {
      const aggName = `${groupByAgg}(${field.name})`;
      const groupByOption: DropDownLabel = { label: aggName };
      groupByOptions.push(groupByOption);
      groupByOptionsData[aggName] = getDefaultGroupByConfig(aggName, field.name, groupByAgg);
    });

    // Aggregations
    const aggOption: DropDownOption = { label: field.name, options: [] };
    const availableAggs = pivotAggsFieldSupport[field.type];
    availableAggs.forEach(agg => {
      const aggName = `${agg}(${field.name})`;
      aggOption.options.push({ label: aggName });
      aggOptionsData[aggName] = { agg, field: field.name, aggName };
    });
    aggOptions.push(aggOption);
  });

  return {
    groupByOptions,
    groupByOptionsData,
    aggOptions,
    aggOptionsData,
  };
}

export const getPivotPreviewDevConsoleStatement = (request: DataFramePreviewRequest) => {
  return `POST _data_frame/transforms/_preview\n${JSON.stringify(request, null, 2)}\n`;
};
