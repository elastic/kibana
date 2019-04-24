/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBoxOptionProps } from '@elastic/eui';

import { StaticIndexPattern } from 'ui/index_patterns';

import {
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
      const label = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS}(${field.name})`;
      const groupByOption: DropDownLabel = { label };
      groupByOptions.push(groupByOption);
      const formRowLabel = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS}_${field.name}`;
      groupByOptionsData[label] = {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
        field: field.name,
        formRowLabel,
      };
    } else if (field.type === FIELD_TYPE.NUMBER) {
      const label = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM}(${field.name})`;
      const groupByOption: DropDownLabel = { label };
      groupByOptions.push(groupByOption);
      const formRowLabel = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM}_${field.name}`;
      groupByOptionsData[label] = {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM,
        field: field.name,
        formRowLabel,
        interval: '10',
      };
    } else if (field.type === FIELD_TYPE.DATE) {
      const label = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM}(${field.name})`;
      const groupByOption: DropDownLabel = { label };
      groupByOptions.push(groupByOption);
      const formRowLabel = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM}_${field.name}`;
      groupByOptionsData[label] = {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM,
        field: field.name,
        formRowLabel,
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
        const label = `${agg}(${field.name})`;
        aggOption.options.push({ label });
        const formRowLabel = `${agg}_${field.name}`;
        aggOptionsData[label] = { agg, field: field.name, formRowLabel };
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
