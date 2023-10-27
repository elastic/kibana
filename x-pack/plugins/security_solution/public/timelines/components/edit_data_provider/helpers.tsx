/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIndex } from 'lodash/fp';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { DataProviderType } from '../../../../common/api/timeline';

import type { BrowserField, BrowserFields } from '../../../common/containers/source';
import { getAllFieldsByName } from '../../../common/containers/source';
import type { QueryOperator } from '../timeline/data_providers/data_provider';
import {
  EXISTS_OPERATOR,
  IS_OPERATOR,
  IS_ONE_OF_OPERATOR,
} from '../timeline/data_providers/data_provider';

import * as i18n from './translations';

/** The list of operators to display in the `Operator` select  */
export const operatorLabels: EuiComboBoxOptionOption[] = [
  {
    label: i18n.IS,
  },
  {
    label: i18n.IS_NOT,
  },
  {
    label: i18n.IS_ONE_OF,
  },
  {
    label: i18n.IS_NOT_ONE_OF,
  },
  {
    label: i18n.EXISTS,
  },
  {
    label: i18n.DOES_NOT_EXIST,
  },
];

export const EMPTY_ARRAY_RESULT = [];

/** Returns the names of fields in a category */
export const getFieldNames = (category: Partial<BrowserField>): string[] =>
  category.fields != null && Object.keys(category.fields).length > 0
    ? Object.keys(category.fields)
    : EMPTY_ARRAY_RESULT;

/** Returns all field names by category, for display in an `EuiComboBox`  */
export const getCategorizedFieldNames = (browserFields: BrowserFields): EuiComboBoxOptionOption[] =>
  !browserFields
    ? EMPTY_ARRAY_RESULT
    : Object.keys(browserFields)
        .sort()
        .map((categoryId) => ({
          label: categoryId,
          options: getFieldNames(browserFields[categoryId]).map((fieldId) => ({
            label: fieldId,
          })),
        }));

/** Returns true if the specified field name is valid */
export const selectionsAreValid = ({
  browserFields,
  selectedField,
  selectedOperator,
  type,
}: {
  browserFields: BrowserFields;
  selectedField: EuiComboBoxOptionOption[];
  selectedOperator: EuiComboBoxOptionOption[];
  type: DataProviderType;
}): boolean => {
  const fieldId = selectedField.length > 0 ? selectedField[0].label : '';
  const operator = selectedOperator.length > 0 ? selectedOperator[0].label : '';

  const fieldIsValid = browserFields && getAllFieldsByName(browserFields)[fieldId] != null;
  const operatorIsValid = findIndex((o) => o.label === operator, operatorLabels) !== -1;
  const isOneOfOperatorSelectionWithTemplate =
    type === DataProviderType.template &&
    (operator === i18n.IS_ONE_OF || operator === i18n.IS_NOT_ONE_OF);

  return fieldIsValid && operatorIsValid && !isOneOfOperatorSelectionWithTemplate;
};

/** Returns a `QueryOperator` based on the user's Operator selection */
export const getQueryOperatorFromSelection = (
  selectedOperator: EuiComboBoxOptionOption[]
): QueryOperator => {
  const selection = selectedOperator.length > 0 ? selectedOperator[0].label : '';

  switch (selection) {
    case i18n.IS: // fall through
    case i18n.IS_NOT:
      return IS_OPERATOR;
    case i18n.IS_ONE_OF: // fall through
    case i18n.IS_NOT_ONE_OF:
      return IS_ONE_OF_OPERATOR;
    case i18n.EXISTS: // fall through
    case i18n.DOES_NOT_EXIST:
      return EXISTS_OPERATOR;
    default:
      return IS_OPERATOR;
  }
};

/**
 * Returns `true` when the search excludes results that match the specified data provider
 */
export const getExcludedFromSelection = (selectedOperator: EuiComboBoxOptionOption[]): boolean => {
  const selection = selectedOperator.length > 0 ? selectedOperator[0].label : '';

  switch (selection) {
    case i18n.IS_NOT: // fall through
    case i18n.IS_NOT_ONE_OF:
    case i18n.DOES_NOT_EXIST:
      return true;
    default:
      return false;
  }
};

/** Ensure that a value passed to ControlledDefaultInput is not an array */
export const sanatizeValue = (value: string | number | boolean | unknown[]): string => {
  if (Array.isArray(value)) {
    return value.length ? `${value[0]}` : '';
  }
  return `${value}`;
};
