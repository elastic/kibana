/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperatorOption, OperatorType, Operator } from './types';

export const isOperator: OperatorOption = {
  message: i18n.translate('xpack.siem.exceptions.isOperatorLabel', {
    defaultMessage: 'is',
  }),
  value: 'is',
  type: OperatorType.PHRASE,
  operator: Operator.INCLUSION,
};

export const isNotOperator: OperatorOption = {
  message: i18n.translate('xpack.siem.exceptions.isNotOperatorLabel', {
    defaultMessage: 'is not',
  }),
  value: 'is_not',
  type: OperatorType.PHRASE,
  operator: Operator.EXCLUSION,
};

export const isOneOfOperator: OperatorOption = {
  message: i18n.translate('xpack.siem.exceptions.isOneOfOperatorLabel', {
    defaultMessage: 'is one of',
  }),
  value: 'is_one_of',
  type: OperatorType.PHRASES,
  operator: Operator.INCLUSION,
};

export const isNotOneOfOperator: OperatorOption = {
  message: i18n.translate('xpack.siem.exceptions.isNotOneOfOperatorLabel', {
    defaultMessage: 'is not one of',
  }),
  value: 'is_not_one_of',
  type: OperatorType.PHRASES,
  operator: Operator.EXCLUSION,
};

export const existsOperator: OperatorOption = {
  message: i18n.translate('xpack.siem.exceptions.existsOperatorLabel', {
    defaultMessage: 'exists',
  }),
  value: 'exists',
  type: OperatorType.EXISTS,
  operator: Operator.INCLUSION,
};

export const doesNotExistOperator: OperatorOption = {
  message: i18n.translate('xpack.siem.exceptions.doesNotExistOperatorLabel', {
    defaultMessage: 'does not exist',
  }),
  value: 'does_not_exist',
  type: OperatorType.EXISTS,
  operator: Operator.EXCLUSION,
};

export const isInListOperator: OperatorOption = {
  message: i18n.translate('xpack.siem.exceptions.isInListOperatorLabel', {
    defaultMessage: 'is in list',
  }),
  value: 'is_in_list',
  type: OperatorType.LIST,
  operator: Operator.INCLUSION,
};

export const isNotInListOperator: OperatorOption = {
  message: i18n.translate('xpack.siem.exceptions.isNotInListOperatorLabel', {
    defaultMessage: 'is not in list',
  }),
  value: 'is_not_in_list',
  type: OperatorType.LIST,
  operator: Operator.EXCLUSION,
};

export const EXCEPTION_OPERATORS: OperatorOption[] = [
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  existsOperator,
  doesNotExistOperator,
  isInListOperator,
  isNotInListOperator,
];
