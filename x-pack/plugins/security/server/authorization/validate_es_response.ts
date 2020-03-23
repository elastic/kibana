/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { HasPrivilegesResponse } from './types';

export function validateEsPrivilegeResponse(
  response: HasPrivilegesResponse,
  application: string,
  actions: string[],
  resources: string[]
) {
  const schema = buildValidationSchema(application, actions, resources);
  const { error, value } = schema.validate(response);

  if (error) {
    throw new Error(
      `Invalid response received from Elasticsearch has_privilege endpoint. ${error}`
    );
  }

  return value;
}

function buildActionsValidationSchema(actions: string[]) {
  return Joi.object({
    ...actions.reduce<Record<string, any>>((acc, action) => {
      return {
        ...acc,
        [action]: Joi.bool().required(),
      };
    }, {}),
  }).required();
}

function buildValidationSchema(application: string, actions: string[], resources: string[]) {
  const actionValidationSchema = buildActionsValidationSchema(actions);

  const resourceValidationSchema = Joi.object({
    ...resources.reduce((acc, resource) => {
      return {
        ...acc,
        [resource]: actionValidationSchema,
      };
    }, {}),
  }).required();

  return Joi.object({
    username: Joi.string().required(),
    has_all_requested: Joi.bool(),
    cluster: Joi.object(),
    application: Joi.object({
      [application]: resourceValidationSchema,
    }).required(),
    index: Joi.object(),
  }).required();
}
