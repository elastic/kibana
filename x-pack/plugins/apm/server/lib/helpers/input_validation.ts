/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi, { Schema } from 'joi';
export const dateValidation = Joi.alternatives()
  .try(Joi.date().iso(), Joi.number())
  .required();

export const withDefaultValidators = (
  validators: { [key: string]: Schema } = {}
) => {
  return Joi.object().keys({
    _debug: Joi.bool(),
    start: dateValidation,
    end: dateValidation,
    uiFilters: Joi.string(),
    ...validators,
  });
};
