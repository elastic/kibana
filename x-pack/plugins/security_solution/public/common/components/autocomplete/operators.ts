/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { OperatorOption } from './types';
import { OperatorEnum, OperatorTypeEnum } from '../../../lists_plugin_deps';

export const isOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isOperatorLabel', {
    defaultMessage: 'is',
  }),
  value: 'is',
  type: OperatorTypeEnum.MATCH,
  operator: OperatorEnum.INCLUDED,
};

export const isNotOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isNotOperatorLabel', {
    defaultMessage: 'is not',
  }),
  value: 'is_not',
  type: OperatorTypeEnum.MATCH,
  operator: OperatorEnum.EXCLUDED,
};

export const isOneOfOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isOneOfOperatorLabel', {
    defaultMessage: 'is one of',
  }),
  value: 'is_one_of',
  type: OperatorTypeEnum.MATCH_ANY,
  operator: OperatorEnum.INCLUDED,
};

export const isNotOneOfOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isNotOneOfOperatorLabel', {
    defaultMessage: 'is not one of',
  }),
  value: 'is_not_one_of',
  type: OperatorTypeEnum.MATCH_ANY,
  operator: OperatorEnum.EXCLUDED,
};

export const existsOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.existsOperatorLabel', {
    defaultMessage: 'exists',
  }),
  value: 'exists',
  type: OperatorTypeEnum.EXISTS,
  operator: OperatorEnum.INCLUDED,
};

export const doesNotExistOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.doesNotExistOperatorLabel', {
    defaultMessage: 'does not exist',
  }),
  value: 'does_not_exist',
  type: OperatorTypeEnum.EXISTS,
  operator: OperatorEnum.EXCLUDED,
};

export const isInListOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isInListOperatorLabel', {
    defaultMessage: 'is in list',
  }),
  value: 'is_in_list',
  type: OperatorTypeEnum.LIST,
  operator: OperatorEnum.INCLUDED,
};

export const isNotInListOperator: OperatorOption = {
  message: i18n.translate('xpack.securitySolution.exceptions.isNotInListOperatorLabel', {
    defaultMessage: 'is not in list',
  }),
  value: 'is_not_in_list',
  type: OperatorTypeEnum.LIST,
  operator: OperatorEnum.EXCLUDED,
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
