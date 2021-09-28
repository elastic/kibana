/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  ActionType,
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeTokens,
  ActionTypeParams,
} from '../types';

export function validateParams<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Tokens extends ActionTypeTokens = ActionTypeTokens,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(actionType: ActionType<Config, Secrets, Params, Tokens, ExecutorResultData>, value: unknown) {
  return validateWithSchema(actionType, 'params', value);
}

export function validateConfig<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Tokens extends ActionTypeTokens = ActionTypeTokens,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(actionType: ActionType<Config, Secrets, Params, Tokens, ExecutorResultData>, value: unknown) {
  return validateWithSchema(actionType, 'config', value);
}

export function validateSecrets<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Tokens extends ActionTypeTokens = ActionTypeTokens,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(actionType: ActionType<Config, Secrets, Params, Tokens, ExecutorResultData>, value: unknown) {
  return validateWithSchema(actionType, 'secrets', value);
}

export function validateTokens<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Tokens extends ActionTypeTokens = ActionTypeTokens,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(actionType: ActionType<Config, Secrets, Params, Tokens, ExecutorResultData>, value: unknown) {
  return validateWithSchema(actionType, 'tokens', value);
}

type ValidKeys = 'params' | 'config' | 'secrets' | 'tokens';

function validateWithSchema<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Tokens extends ActionTypeTokens = ActionTypeTokens,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(
  actionType: ActionType<Config, Secrets, Params, Tokens, ExecutorResultData>,
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
        case 'tokens':
          name = 'action type tokens';
          if (actionType.validate.tokens) {
            return actionType.validate.tokens.validate(value);
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
