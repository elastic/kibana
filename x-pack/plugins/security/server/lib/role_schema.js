/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

export const roleSchema = {
  name: Joi.string().required(),
  cluster: Joi.array().items(Joi.string()),
  indices: Joi.array().items({
    names: Joi.array().items(Joi.string()),
    field_security: Joi.object().keys({
      grant: Joi.array().items(Joi.string()),
      except: Joi.array().items(Joi.string())
    }),
    privileges: Joi.array().items(Joi.string()),
    query: Joi.string().allow('')
  }),
  run_as: Joi.array().items(Joi.string()),
  metadata: Joi.object(),
  transient_metadata: Joi.object()
};