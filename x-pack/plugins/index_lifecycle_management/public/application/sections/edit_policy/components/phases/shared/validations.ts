/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ValidationFunc, fieldValidators } from '../../../../../../shared_imports';

export const positiveNumberRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.numberAboveZeroRequiredError',
  {
    defaultMessage: 'Only numbers above 0 are allowed.',
  }
);

const { numberGreaterThanField } = fieldValidators;

export const ifExistsNumberGreaterThanZero: ValidationFunc<any, any, any> = (arg) => {
  if (arg.value) {
    return numberGreaterThanField({
      than: 0,
      message: positiveNumberRequiredMessage,
    })({
      ...arg,
      value: parseInt(arg.value, 10),
    });
  }
};
