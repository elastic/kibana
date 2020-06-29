/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Operator, OperatorType, OperatorOption } from './types';

export const isOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isOperatorLabel', {
    defaultMessage: 'is',
  }),
  value: 'is',
  type: OperatorType.MATCH,
  operator: Operator.INCLUDED,
};

export const isNotOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isNotOperatorLabel', {
    defaultMessage: 'is not',
  }),
  value: 'is_not',
  type: OperatorType.MATCH,
  operator: Operator.EXCLUDED,
};

export const isOneOfOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isOneOfOperatorLabel', {
    defaultMessage: 'is one of',
  }),
  value: 'is_one_of',
  type: OperatorType.MATCH_ANY,
  operator: Operator.INCLUDED,
};

export const isNotOneOfOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isNotOneOfOperatorLabel', {
    defaultMessage: 'is not one of',
  }),
  value: 'is_not_one_of',
  type: OperatorType.MATCH_ANY,
  operator: Operator.EXCLUDED,
};

export const existsOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.existsOperatorLabel', {
    defaultMessage: 'exists',
  }),
  value: 'exists',
  type: OperatorType.EXISTS,
  operator: Operator.INCLUDED,
};

export const doesNotExistOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.doesNotExistOperatorLabel', {
    defaultMessage: 'does not exist',
  }),
  value: 'does_not_exist',
  type: OperatorType.EXISTS,
  operator: Operator.EXCLUDED,
};

export const isInListOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isInListOperatorLabel', {
    defaultMessage: 'is in list',
  }),
  value: 'is_in_list',
  type: OperatorType.LIST,
  operator: Operator.INCLUDED,
};

export const isNotInListOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isNotInListOperatorLabel', {
    defaultMessage: 'is not in list',
  }),
  value: 'is_not_in_list',
  type: OperatorType.LIST,
  operator: Operator.EXCLUDED,
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
