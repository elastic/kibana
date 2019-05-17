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
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
  pivotSupportedAggs,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../common';

export enum FIELD_TYPE {
  DATE = 'date',
  IP = 'ip',
  NUMBER = 'number',
  STRING = 'string',
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
    .map(field => ({ name: field.name, type: field.type }));

  fields.forEach(field => {
    // group by
    if (field.type === FIELD_TYPE.STRING) {
      const aggName = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS}(${field.name})`;
      const groupByOption: DropDownLabel = { label: aggName };
      groupByOptions.push(groupByOption);
      groupByOptionsData[aggName] = {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
        field: field.name,
        aggName,
      };
    } else if (field.type === FIELD_TYPE.NUMBER) {
      const aggName = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM}(${field.name})`;
      const groupByOption: DropDownLabel = { label: aggName };
      groupByOptions.push(groupByOption);
      groupByOptionsData[aggName] = {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM,
        field: field.name,
        aggName,
        interval: '10',
      };
    } else if (field.type === FIELD_TYPE.DATE) {
      const aggName = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM}(${field.name})`;
      const groupByOption: DropDownLabel = { label: aggName };
      groupByOptions.push(groupByOption);
      groupByOptionsData[aggName] = {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM,
        field: field.name,
        aggName,
        interval: '1m',
      };
    }

    // aggregations
    const aggOption: DropDownOption = { label: field.name, options: [] };
    pivotSupportedAggs.forEach(agg => {
      if (
        (agg === PIVOT_SUPPORTED_AGGS.CARDINALITY &&
          (field.type === FIELD_TYPE.STRING || field.type === FIELD_TYPE.IP)) ||
        (agg !== PIVOT_SUPPORTED_AGGS.CARDINALITY && field.type === FIELD_TYPE.NUMBER)
      ) {
        const aggName = `${agg}(${field.name})`;
        aggOption.options.push({ label: aggName });
        aggOptionsData[aggName] = { agg, field: field.name, aggName };
      }
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
