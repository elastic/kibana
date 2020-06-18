/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { findIndex } from 'lodash/fp';
import { EuiComboBoxOptionOption } from '@elastic/eui';

import { BrowserField, BrowserFields, getAllFieldsByName } from '../../../common/containers/source';
import {
  QueryOperator,
  EXISTS_OPERATOR,
  IS_OPERATOR,
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
    label: i18n.EXISTS,
  },
  {
    label: i18n.DOES_NOT_EXIST,
  },
];

/** Returns the names of fields in a category */
export const getFieldNames = (category: Partial<BrowserField>): string[] =>
  category.fields != null && Object.keys(category.fields).length > 0
    ? Object.keys(category.fields)
    : [];

/** Returns all field names by category, for display in an `EuiComboBox`  */
export const getCategorizedFieldNames = (browserFields: BrowserFields): EuiComboBoxOptionOption[] =>
  Object.keys(browserFields)
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
}: {
  browserFields: BrowserFields;
  selectedField: EuiComboBoxOptionOption[];
  selectedOperator: EuiComboBoxOptionOption[];
}): boolean => {
  const fieldId = selectedField.length > 0 ? selectedField[0].label : '';
  const operator = selectedOperator.length > 0 ? selectedOperator[0].label : '';

  const fieldIsValid = getAllFieldsByName(browserFields)[fieldId] != null;
  const operatorIsValid = findIndex((o) => o.label === operator, operatorLabels) !== -1;

  return fieldIsValid && operatorIsValid;
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
    case i18n.DOES_NOT_EXIST:
      return true;
    default:
      return false;
  }
};
