/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
        const actualResources = Object.keys(value);
        const unexpectedResource = actualResources.find((ar) => !resources.includes(ar));
        if (unexpectedResource) {
          throw new Error(`Unexpected resource in payload: ${unexpectedResource}`);
        }
        const missingResource = resources.find((r) => !actualResources.includes(r));
        if (missingResource) {
          throw new Error(`Missing expected resource in payload: ${missingResource}`);
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
