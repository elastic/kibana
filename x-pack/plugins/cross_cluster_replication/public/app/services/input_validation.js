/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import Joi from 'joi';
import { i18n } from '@kbn/i18n';

export const i18nValidationErrorMessages = {
  'number.base': field => (
    i18n.translate('xpack.formInputValidation.notNumberError', {
      defaultMessage: '{field} must be a number.',
      values: { field }
    })
  )
};

export const getValidator = (validators = {}) => {
  return Joi.object().keys({
    ...validators
  });
};
