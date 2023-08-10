/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { numberValidator } from '@kbn/ml-agg-utils';

import type { Validator } from './types';

const numberRange10To10000NotValidErrorMessage = i18n.translate(
  'xpack.transform.transformSettingValidations.numberRange10To10000NotValidErrorMessage',
  {
    defaultMessage: 'Value needs to be an integer between 10 and 10000.',
  }
);

export const integerRange10To10000Validator: Validator = (value) =>
  !(value + '').includes('.') &&
  numberValidator({ min: 10, max: 100001, integerOnly: true })(+value) === null
    ? []
    : [numberRange10To10000NotValidErrorMessage];
