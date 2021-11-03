/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { HasPrivilegesResponse } from './types';

const anyBoolean = schema.boolean();
const anyBooleanArray = schema.arrayOf(anyBoolean);
const anyString = schema.string();
const anyObject = schema.object({}, { unknowns: 'allow' });

/**
 * Validates an Elasticsearch "Has privileges" response against the expected application, actions, and resources.
 *
 * Note: the `actions` and `resources` parameters must be unique string arrays; any duplicates will cause validation to fail.
 */
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

function buildValidationSchema(application: string, actions: string[], resources: string[]) {
  const actionsValidationSchema = schema.object(
    {},
    {
      unknowns: 'allow',
      validate: (value) => {
        const actualActions = Object.keys(value).sort();
        if (
          actions.length !== actualActions.length ||
          ![...actions].sort().every((x, i) => x === actualActions[i])
        ) {
          throw new Error('Payload did not match expected actions');
        }

        anyBooleanArray.validate(Object.values(value));
      },
    }
  );

  const resourcesValidationSchema = schema.object(
    {},
    {
      unknowns: 'allow',
      validate: (value) => {
        const actualResources = Object.keys(value).sort();
        if (
          resources.length !== actualResources.length ||
          ![...resources].sort().every((x, i) => x === actualResources[i])
        ) {
          throw new Error('Payload did not match expected resources');
        }

        Object.values(value).forEach((actionResult) => {
          actionsValidationSchema.validate(actionResult);
        });
      },
    }
  );

  return schema.object({
    username: anyString,
    has_all_requested: anyBoolean,
    cluster: anyObject,
    application: schema.object({
      [application]: resourcesValidationSchema,
    }),
    index: anyObject,
  });
}
