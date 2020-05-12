/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ActionType, ActionValidationService } from '../types';

type ValidKeys = 'params' | 'config' | 'secrets';

export function validateParams(
  actionType: ActionType,
  value: unknown,
  validationService: ActionValidationService
) {
  return validateWithSchema(actionType, 'action params', 'params', value, validationService);
}

export function validateConfig(
  actionType: ActionType,
  value: unknown,
  validationService: ActionValidationService
) {
  return validateWithSchema(actionType, 'action type config', 'config', value, validationService);
}

export function validateSecrets(
  actionType: ActionType,
  value: unknown,
  validationService: ActionValidationService
) {
  return validateWithSchema(actionType, 'action type secrets', 'secrets', value, validationService);
}

function validateWithSchema(
  actionType: ActionType,
  name: string,
  key: ValidKeys,
  value: unknown,
  validationService: ActionValidationService
): Record<string, unknown> {
  const validator = actionType?.validate?.[key];
  const runtimeValidator = actionType.runtimeValidate?.[key];

  if (validator) {
    try {
      value = validator.validate(value);
      if (runtimeValidator) {
        const message = runtimeValidator(value, validationService);
        if (message) {
          throw new Error(message);
        }
      }
    } catch (err) {
      // we can't really i18n this yet, since the err.message isn't i18n'd itself
      throw Boom.badRequest(`error validating ${name}: ${err.message}`);
    }
  }

  return value as Record<string, unknown>;
}
