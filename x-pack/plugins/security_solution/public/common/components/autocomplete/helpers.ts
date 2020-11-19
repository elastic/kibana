/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { EuiComboBoxOptionOption } from '@elastic/eui';

import { IFieldType } from '../../../../../../../src/plugins/data/common';

import {
  EXCEPTION_OPERATORS,
  isOperator,
  isNotOperator,
  existsOperator,
  doesNotExistOperator,
} from './operators';
import { GetGenericComboBoxPropsReturn, OperatorOption } from './types';
import * as i18n from './translations';
import { BrowserFields, BrowserField, getAllBrowserFields } from '../../containers/source';
import { getCategorizedFieldNames } from '../../../timelines/components/edit_data_provider/helpers';

/**
 * Returns the appropriate operators given a field type
 *
 * @param field IFieldType selected field
 *
 */
export const getOperators = (field: IFieldType | undefined): OperatorOption[] => {
  if (field == null) {
    return [isOperator];
  } else if (field.type === 'boolean') {
    return [isOperator, isNotOperator, existsOperator, doesNotExistOperator];
  } else if (field.type === 'nested') {
    return [isOperator];
  } else {
    return EXCEPTION_OPERATORS;
  }
};

/**
 * Determines if empty value is ok
 *
 * @param param the value being checked
 * @param field the selected field
 * @param isRequired whether or not an empty value is allowed
 * @param touched has field been touched by user
 * @returns undefined if valid, string with error message if invalid,
 * null if no checks matched
 */
export const checkEmptyValue = (
  param: string | undefined,
  field: IFieldType | undefined,
  isRequired: boolean,
  touched: boolean
): string | undefined | null => {
  if (isRequired && touched && (param == null || param.trim() === '')) {
    return i18n.FIELD_REQUIRED_ERR;
  }

  if (
    field == null ||
    (isRequired && !touched) ||
    (!isRequired && (param == null || param === ''))
  ) {
    return undefined;
  }

  return null;
};

/**
 * Very basic validation for values
 *
 * @param param the value being checked
 * @param field the selected field
 * @param isRequired whether or not an empty value is allowed
 * @param touched has field been touched by user
 * @returns undefined if valid, string with error message if invalid
 */
export const paramIsValid = (
  param: string | undefined,
  field: IFieldType | undefined,
  isRequired: boolean,
  touched: boolean
): string | undefined => {
  if (field == null) {
    return undefined;
  }

  const emptyValueError = checkEmptyValue(param, field, isRequired, touched);
  if (emptyValueError !== null) {
    return emptyValueError;
  }

  switch (field.type) {
    case 'date':
      const moment = dateMath.parse(param ?? '');
      const isDate = Boolean(moment && moment.isValid());
      return isDate ? undefined : i18n.DATE_ERR;
    case 'number':
      const isNum = param != null && param.trim() !== '' && !isNaN(+param);
      return isNum ? undefined : i18n.NUMBER_ERR;
    default:
      return undefined;
  }
};

/**
 * Determines the options, selected values and option labels for EUI combo box
 *
 * @param options options user can select from
 * @param selectedOptions user selection if any
 * @param getLabel helper function to know which property to use for labels
 */
export function getGenericComboBoxProps<T>({
  options,
  selectedOptions,
  getLabel,
}: {
  options: T[];
  selectedOptions: T[];
  getLabel: (value: T) => string;
}): GetGenericComboBoxPropsReturn {
  const newLabels = options.map(getLabel);
  const newComboOptions: EuiComboBoxOptionOption[] = newLabels.map((label) => ({ label }));
  const newSelectedComboOptions = selectedOptions
    .map(getLabel)
    .filter((option) => {
      return newLabels.indexOf(option) !== -1;
    })
    .map((option) => {
      return newComboOptions[newLabels.indexOf(option)];
    });

  return {
    comboOptions: newComboOptions,
    labels: newLabels,
    selectedComboOptions: newSelectedComboOptions,
  };
}

export const getSelectedFieldToBrowserField = (
  selectedField: string,
  browserFields: BrowserFields
): Partial<BrowserField> | undefined => {
  const fields = getAllBrowserFields(browserFields);
  return fields.find((field) => field.name === selectedField);
};

export const getSelectionToComboBoxOption = (
  selectedField: string,
  browserFields: BrowserFields
): { error: null | string; selection: EuiComboBoxOptionOption[] } => {
  const field = getSelectedFieldToBrowserField(selectedField, browserFields);

  if (field != null && field.name != null) {
    return {
      error: null,
      selection: [{ label: field.name }],
    };
  } else {
    return {
      error: i18n.TIMESTAMP_OVERRIDE_ERROR(selectedField),
      selection: [],
    };
  }
};

export const getSelectOptions = (fields: BrowserFields | undefined): EuiComboBoxOptionOption[] => {
  if (fields == null) {
    return [];
  } else {
    return getCategorizedFieldNames(fields);
  }
};
