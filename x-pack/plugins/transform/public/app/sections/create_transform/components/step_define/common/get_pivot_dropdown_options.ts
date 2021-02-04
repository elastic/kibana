/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  ES_FIELD_TYPES,
  IndexPattern,
  KBN_FIELD_TYPES,
} from '../../../../../../../../../../src/plugins/data/public';

import { getNestedProperty } from '../../../../../../../common/utils/object_utils';

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
import type { Field, StepDefineExposedState } from './types';

const illegalEsAggNameChars = /[[\]>]/g;

export function getKibanaFieldTypeFromEsType(type: string): KBN_FIELD_TYPES {
  switch (type) {
    case ES_FIELD_TYPES.FLOAT:
    case ES_FIELD_TYPES.HALF_FLOAT:
    case ES_FIELD_TYPES.SCALED_FLOAT:
    case ES_FIELD_TYPES.DOUBLE:
    case ES_FIELD_TYPES.INTEGER:
    case ES_FIELD_TYPES.LONG:
    case ES_FIELD_TYPES.SHORT:
    case ES_FIELD_TYPES.UNSIGNED_LONG:
      return KBN_FIELD_TYPES.NUMBER;

    case ES_FIELD_TYPES.DATE:
    case ES_FIELD_TYPES.DATE_NANOS:
      return KBN_FIELD_TYPES.DATE;

    case ES_FIELD_TYPES.KEYWORD:
    case ES_FIELD_TYPES.STRING:
      return KBN_FIELD_TYPES.STRING;

    default:
      return type as KBN_FIELD_TYPES;
  }
}

export function getPivotDropdownOptions(
  indexPattern: IndexPattern,
  runtimeMappings?: StepDefineExposedState['runtimeMappings']
) {
  // The available group by options
  const groupByOptions: EuiComboBoxOptionOption[] = [];
  const groupByOptionsData: PivotGroupByConfigWithUiSupportDict = {};

  // The available aggregations
  const aggOptions: EuiComboBoxOptionOption[] = [];
  const aggOptionsData: PivotAggsConfigWithUiSupportDict = {};

  const ignoreFieldNames = ['_id', '_index', '_type'];
  const indexPatternFields = indexPattern.fields
    .filter((field) => field.aggregatable === true && !ignoreFieldNames.includes(field.name))
    .map((field): Field => ({ name: field.name, type: field.type as KBN_FIELD_TYPES }));

  // Support for runtime_mappings that are defined by queries
  let runtimeFields: Field[] = [];
  if (typeof runtimeMappings === 'object') {
    runtimeFields = Object.keys(runtimeMappings).map((fieldName) => {
      const field = runtimeMappings[fieldName];
      return { name: fieldName, type: getKibanaFieldTypeFromEsType(field.type) };
    });
  }

  const combinedFields = [...indexPatternFields, ...runtimeFields];
  combinedFields.forEach((field) => {
    // Group by
    const availableGroupByAggs: [] = getNestedProperty(pivotGroupByFieldSupport, field.type);

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
    const availableAggs: [] = getNestedProperty(pivotAggsFieldSupport, field.type);

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
