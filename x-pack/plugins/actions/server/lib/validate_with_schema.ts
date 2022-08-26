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
  ActionTypeParams,
  ValidatorServices,
} from '../types';

export function validateParams<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(
  actionType: ActionType<Config, Secrets, Params, ExecutorResultData>,
  value: unknown,
  validatorServices: ValidatorServices
) {
  return validateWithSchema(actionType, 'params', value, validatorServices);
}

export function validateConfig<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(
  actionType: ActionType<Config, Secrets, Params, ExecutorResultData>,
  value: unknown,
  validatorServices: ValidatorServices
) {
  return validateWithSchema(actionType, 'config', value, validatorServices);
}

export function validateSecrets<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(
  actionType: ActionType<Config, Secrets, Params, ExecutorResultData>,
  value: unknown,
  validatorServices: ValidatorServices
) {
  return validateWithSchema(actionType, 'secrets', value, validatorServices);
}

export function validateConnector<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(actionType: ActionType<Config, Secrets, Params, ExecutorResultData>, value: unknown) {
  if (actionType.validate && actionType.validate.connector) {
    try {
      const connectorValue = value as { config: Config; secrets: Secrets };

      // Connector config and secrets should be defined
      if (connectorValue.config == null) {
        throw new Error(`config must be defined`);
      }
      if (connectorValue.secrets == null) {
        throw new Error(`secrets must be defined`);
      }
      const result = actionType.validate.connector(connectorValue.config, connectorValue.secrets);
      if (result !== null) {
        throw new Error(result);
      }
    } catch (err) {
      throw Boom.badRequest(`error validating action type connector: ${err.message}`);
    }
  }
  return null;
}

type ValidKeys = 'params' | 'config' | 'secrets';

function validateWithSchema<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
>(
  actionType: ActionType<Config, Secrets, Params, ExecutorResultData>,
  key: ValidKeys,
  value: unknown | { config: unknown; secrets: unknown },
  validatorServices: ValidatorServices
): Record<string, unknown> {
  if (actionType.validate) {
    let name;
    try {
      switch (key) {
        case 'params':
          name = 'action params';
          if (actionType.validate.params) {
            const params = actionType.validate.params.schema.validate(value);
            if (actionType.validate.params.customValidator) {
              const result = actionType.validate.params.customValidator(params, validatorServices);
              if (result) {
                throw new Error(result);
              }
            }
            return params;
          }
          break;
        case 'config':
          name = 'action type config';
          if (actionType.validate.config) {
            const config = actionType.validate.config.schema.validate(value);
            if (actionType.validate.config.customValidator) {
              const result = actionType.validate.config.customValidator(config, validatorServices);
              if (result) {
                throw new Error(result);
              }
            }
            return config;
          }

          break;
        case 'secrets':
          name = 'action type secrets';
          if (actionType.validate.secrets) {
            const secrets = actionType.validate.secrets.schema.validate(value);
            if (actionType.validate.secrets.customValidator) {
              const result = actionType.validate.secrets.customValidator(
                secrets,
                validatorServices
              );
              if (result) {
                throw new Error(result);
              }
            }
            return secrets;
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
