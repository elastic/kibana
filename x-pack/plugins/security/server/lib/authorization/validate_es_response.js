/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

export function validateEsPrivilegeResponse(response, application, actions, resources) {
  const schema = buildValidationSchema(application, actions, resources);
  const { error, value } = schema.validate(response);

  if (error) {
    throw new Error(`Invalid response received from Elasticsearch has_privilege endpoint. ${error}`);
  }

  return value;
}

function buildActionsValidationSchema(actions) {
  return Joi.object({
    ...actions.reduce((acc, action) => {
      return {
        ...acc,
        [action]: Joi.bool().required()
      };
    }, {})
  }).required();
}

function buildValidationSchema(application, actions, resources) {

  const actionValidationSchema = buildActionsValidationSchema(actions);

  const resourceValidationSchema = Joi.object({
    ...resources.reduce((acc, resource) => {
      return {
        ...acc,
        [resource]: actionValidationSchema
      };
    }, {})
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
