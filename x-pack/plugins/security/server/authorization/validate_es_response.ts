/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { HasPrivilegesResponse } from './types';

export function validateEsPrivilegeResponse(
  response: HasPrivilegesResponse,
  application: string,
  actions: string[],
  resources: string[]
) {
  const validationSchema = buildValidationSchema(application, actions, resources);
  try {
    validationSchema.validate(response);
  } catch (e) {
    throw new Error(`Invalid response received from Elasticsearch has_privilege endpoint. ${e}`);
  }

  return response;
}

function buildActionsValidationSchema(actions: string[]) {
  return schema.object({
    ...actions.reduce<Record<string, any>>((acc, action) => {
      return {
        ...acc,
        [action]: schema.boolean(),
      };
    }, {}),
  });
}

function buildValidationSchema(application: string, actions: string[], resources: string[]) {
  const actionValidationSchema = buildActionsValidationSchema(actions);

  const resourceValidationSchema = schema.object(
    {},
    {
      unknowns: 'allow',
      validate: (value) => {
        const actualResources = Object.keys(value).sort();
        if (
          resources.length !== actualResources.length ||
          !resources.sort().every((x, i) => x === actualResources[i])
        ) {
          throw new Error('Payload did not match expected resources');
        }

        Object.values(value).forEach((actionResult) => {
          actionValidationSchema.validate(actionResult);
        });
      },
    }
  );

  return schema.object({
    username: schema.string(),
    has_all_requested: schema.boolean(),
    cluster: schema.object({}, { unknowns: 'allow' }),
    application: schema.object({
      [application]: resourceValidationSchema,
    }),
    index: schema.object({}, { unknowns: 'allow' }),
  });
}
