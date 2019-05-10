/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBoxOptionProps } from '@elastic/eui';

import { StaticIndexPattern } from 'ui/index_patterns';

import {
  DataFramePreviewRequest,
  DropDownLabel,
  DropDownOption,
  FieldName,
  FieldType,
  FIELD_TYPE,
  PivotAggsConfigDict,
  pivotAggsFieldSupport,
  PivotGroupByConfigDict,
  pivotGroupByFieldSupport,
  pivotSupportedAggs,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../common';

interface Field {
  name: FieldName;
  type: FieldType;
}

function getDefaultGroupByConfig(
  aggName: string,
  field: Field,
  groupByAgg: PIVOT_SUPPORTED_GROUP_BY_AGGS
) {
  switch (groupByAgg) {
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS:
      return {
        agg: groupByAgg,
        aggName,
        field: field.name,
      };
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM:
      return {
        agg: groupByAgg,
        aggName,
        field: field.name,
        interval: '10',
      };
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM:
      return {
        agg: groupByAgg,
        aggName,
        field: field.name,
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

  const fields = indexPattern.fields
    .filter(field => field.aggregatable === true)
    .map((field): Field => ({ name: field.name, type: field.type as FIELD_TYPE }));

  fields.forEach(field => {
    // Group by
    const availableGroupByAggs = pivotGroupByFieldSupport[field.type];
    availableGroupByAggs.forEach(groupByAgg => {
      const aggName = `${groupByAgg}(${field.name})`;
      const groupByOption: DropDownLabel = { label: aggName };
      groupByOptions.push(groupByOption);
      groupByOptionsData[aggName] = getDefaultGroupByConfig(aggName, field, groupByAgg);
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
