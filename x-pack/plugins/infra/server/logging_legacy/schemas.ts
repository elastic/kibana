/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';

export const timestampSchema = Joi.number()
  .integer()
  .min(0);

export const logEntryFieldsMappingSchema = Joi.object().keys({
  message: Joi.string().required(),
  tiebreaker: Joi.string().required(),
  time: Joi.string().required(),
});

export const logEntryTimeSchema = Joi.object().keys({
  tiebreaker: Joi.number().integer(),
  time: timestampSchema,
});

export const indicesSchema = Joi.array().items(Joi.string());

export const summaryBucketSizeSchema = Joi.object().keys({
  unit: Joi.string()
    .valid(['y', 'M', 'w', 'd', 'h', 'm', 's'])
    .required(),
  value: Joi.number()
    .integer()
    .min(0)
    .required(),
});
