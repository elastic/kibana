/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  IndexPattern,
  KBN_FIELD_TYPES,
} from '../../../../../../../../../../src/plugins/data/public';

import {
  DropDownLabel,
  DropDownOption,
  PivotAggsConfigWithUiSupportDict,
  pivotAggsFieldSupport,
  PivotGroupByConfigWithUiSupportDict,
  pivotGroupByFieldSupport,
} from '../../../../../common';

import { getDefaultAggregationConfig } from './get_default_aggregation_config';
import { getDefaultGroupByConfig } from './get_default_group_by_config';
import { Field } from './types';

const illegalEsAggNameChars = /[[\]>]/g;

export function getPivotDropdownOptions(indexPattern: IndexPattern) {
  // The available group by options
  const groupByOptions: EuiComboBoxOptionOption[] = [];
  const groupByOptionsData: PivotGroupByConfigWithUiSupportDict = {};

  // The available aggregations
  const aggOptions: EuiComboBoxOptionOption[] = [];
  const aggOptionsData: PivotAggsConfigWithUiSupportDict = {};

  const ignoreFieldNames = ['_id', '_index', '_type'];
  const fields = indexPattern.fields
    .filter((field) => field.aggregatable === true && !ignoreFieldNames.includes(field.name))
    .map((field): Field => ({ name: field.name, type: field.type as KBN_FIELD_TYPES }));

  fields.forEach((field) => {
    // Group by
    const availableGroupByAggs: [] = get(pivotGroupByFieldSupport, field.type);

    if (availableGroupByAggs !== undefined) {
      availableGroupByAggs.forEach((groupByAgg) => {
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
    const availableAggs: [] = get(pivotAggsFieldSupport, field.type);

    if (availableAggs !== undefined) {
      availableAggs.forEach((agg) => {
        // Aggregation name is formatted like `fieldname.sum`. Illegal characters will be removed.
        const aggName = `${field.name.replace(illegalEsAggNameChars, '').trim()}.${agg}`;
        // Option name in the dropdown for the aggregation is in the form of `sum(fieldname)`.
        const dropDownName = `${agg}(${field.name})`;
        aggOption.options.push({ label: dropDownName });
        aggOptionsData[dropDownName] = getDefaultAggregationConfig(
          aggName,
          dropDownName,
          field.name,
          agg
        );
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
