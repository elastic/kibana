/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ActionType } from '../types';

export function validateParams(actionType: ActionType, value: unknown) {
  return validateWithSchema(actionType, 'params', value);
}

export function validateConfig(actionType: ActionType, value: unknown) {
  return validateWithSchema(actionType, 'config', value);
}

export function validateSecrets(actionType: ActionType, value: unknown) {
  return validateWithSchema(actionType, 'secrets', value);
}

type ValidKeys = 'params' | 'config' | 'secrets';

function validateWithSchema(
  actionType: ActionType,
  key: ValidKeys,
  value: unknown
): Record<string, unknown> {
  if (actionType.validate) {
    let name;
    try {
      switch (key) {
        case 'params':
          name = 'action params';
          if (actionType.validate.params) {
            return actionType.validate.params.validate(value);
          }
          break;
        case 'config':
          name = 'action type config';
          if (actionType.validate.config) {
            return actionType.validate.config.validate(value);
          }

          break;
        case 'secrets':
          name = 'action type secrets';
          if (actionType.validate.secrets) {
            return actionType.validate.secrets.validate(value);
          }
          break;
        default:
          // should never happen, but left here for future-proofing
          throw new Error(`invalid actionType validate key: ${key}`);
      }
    } catch (err) {
      // we can't really i18n this yet, since the err.message isn't i18n'd itself
      throw Boom.badRequest(`error validating ${name}: ${err.message}`);
    }
  }

  return value as Record<string, unknown>;
}
