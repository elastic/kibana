/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { HasPrivilegesResponse } from './types';

const baseResponseSchema = schema.object({
  username: schema.string(),
  has_all_requested: schema.boolean(),
  application: schema.object({}, { unknowns: 'allow' }),
  cluster: schema.object({}, { unknowns: 'allow' }),
  index: schema.object({}, { unknowns: 'allow' }),
});
const boolArraySchema = schema.arrayOf(schema.boolean());

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
  try {
    baseResponseSchema.validate(response);
    validateResponse(response, application, actions, resources);
  } catch (e) {
    throw new Error(`Invalid response received from Elasticsearch has_privilege endpoint. ${e}`);
  }

  return response;
}

const validateResponse = (
  response: HasPrivilegesResponse,
  applicationName: string,
  actionNames: string[],
  resourceNames: string[]
): void => {
  const actualApplicationNames = Object.keys(response.application);
  if (actualApplicationNames.length !== 1) {
    throw new Error(`Expected one application but received ${actualApplicationNames.length}`);
  }
  if (actualApplicationNames[0] !== applicationName) {
    throw new Error(
      `Expected application to be ${applicationName} but received ${actualApplicationNames[0]}`
    );
  }

  const actualApplication = response.application[applicationName];
  const actualResourceNames = Object.keys(actualApplication).sort();
  if (
    resourceNames.length !== actualResourceNames.length ||
    ![...resourceNames].sort().every((x, i) => x === actualResourceNames[i])
  ) {
    throw new Error('Payload did not match expected resources');
  }

  const sortedActionNames = [...actionNames].sort();
  Object.values(actualApplication).forEach((actualResource) => {
    const actualActionNames = Object.keys(actualResource).sort();
    if (
      actionNames.length !== actualActionNames.length ||
      !sortedActionNames.every((x, i) => x === actualActionNames[i])
    ) {
      throw new Error('Payload did not match expected actions');
    }

    boolArraySchema.validate(Object.values(actualResource), {}, `application.${applicationName}`);
  });
};

/*
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
*/
