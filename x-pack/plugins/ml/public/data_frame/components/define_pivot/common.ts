/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBoxOptionProps } from '@elastic/eui';

import { IndexPattern } from 'ui/index_patterns';

import { KBN_FIELD_TYPES } from '../../../../common/constants/field_types';

import {
  DataFramePreviewRequest,
  DropDownLabel,
  DropDownOption,
  FieldName,
  PivotAggsConfigDict,
  pivotAggsFieldSupport,
  PivotGroupByConfig,
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
  dropDownName: string,
  fieldName: FieldName,
  groupByAgg: PIVOT_SUPPORTED_GROUP_BY_AGGS
): PivotGroupByConfig {
  switch (groupByAgg) {
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS:
      return {
        agg: groupByAgg,
        aggName,
        dropDownName,
        field: fieldName,
      };
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM:
      return {
        agg: groupByAgg,
        aggName,
        dropDownName,
        field: fieldName,
        interval: '10',
      };
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM:
      return {
        agg: groupByAgg,
        aggName,
        dropDownName,
        field: fieldName,
        calendar_interval: '1m',
      };
  }
}

const illegalEsAggNameChars = /[[\]>]/g;

export function getPivotDropdownOptions(indexPattern: IndexPattern) {
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
    if (availableGroupByAggs !== undefined) {
      availableGroupByAggs.forEach(groupByAgg => {
        // Aggregation name for the group-by is the plain field name. Illegal characters will be removed.
        const aggName = field.name.replace(illegalEsAggNameChars, '').trim();
        // Option name in the dropdown for the group-by is in the form of `sum(fieldname)`.
        const dropDownName = `${groupByAgg}(${field.name})`;
        const groupByOption: DropDownLabel = { label: dropDownName };
        groupByOptions.push(groupByOption);
        groupByOptionsData[dropDownName] = getDefaultGroupByConfig(
          aggName,
          dropDownName,
          field.name,
          groupByAgg
        );
      });
    }

    // Aggregations
    const aggOption: DropDownOption = { label: field.name, options: [] };
    const availableAggs = pivotAggsFieldSupport[field.type];
    if (availableAggs !== undefined) {
      availableAggs.forEach(agg => {
        // Aggregation name is formatted like `fieldname.sum`. Illegal characters will be removed.
        const aggName = `${field.name.replace(illegalEsAggNameChars, '').trim()}.${agg}`;
        // Option name in the dropdown for the aggregation is in the form of `sum(fieldname)`.
        const dropDownName = `${agg}(${field.name})`;
        aggOption.options.push({ label: dropDownName });
        aggOptionsData[dropDownName] = { agg, field: field.name, aggName, dropDownName };
      });
    }
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
