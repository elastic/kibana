/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ActionTypeConfig, ActionTypeSecrets, ValidatorServices } from '../types';
import { SubActionConnectorType, ValidateFn, Validators, ValidatorType } from './types';

export const buildValidators = <
  Config extends ActionTypeConfig,
  Secrets extends ActionTypeSecrets
>({
  connector,
  configurationUtilities,
}: {
  configurationUtilities: ActionsConfigurationUtilities;
  connector: SubActionConnectorType<Config, Secrets>;
}) => {
  const { config, secrets } = buildCustomValidators(connector.validators);

  return {
    config: {
      schema: connector.schema.config,
      customValidator: config,
    },
    secrets: {
      schema: connector.schema.secrets,
      customValidator: secrets,
    },
    params: {
      schema: schema.object({
        subAction: schema.string(),
        /**
         * With this validation we enforce the subActionParams to be an object.
         * Each sub action has different parameters and they are validated inside the executor
         * (x-pack/plugins/actions/server/sub_action_framework/executor.ts). For that reason,
         * we allow all unknowns at this level of validation as they are not known at this
         * time of execution.
         */
        subActionParams: schema.object({}, { unknowns: 'allow' }),
      }),
    },
  };
};

const buildCustomValidators = <Config, Secrets>(validators?: Validators<Config, Secrets>) => {
  const partitionedValidators: {
    config: Array<ValidateFn<Config>>;
    secrets: Array<ValidateFn<Secrets>>;
  } = { config: [], secrets: [] };

  for (const validatorInfo of validators ?? []) {
    if (validatorInfo.type === ValidatorType.CONFIG) {
      partitionedValidators.config.push(validatorInfo.validator);
    } else {
      partitionedValidators.secrets.push(validatorInfo.validator);
    }
  }

  return {
    config: createCustomValidatorFunction(partitionedValidators.config),
    secrets: createCustomValidatorFunction(partitionedValidators.secrets),
  };
};

const createCustomValidatorFunction = <T>(validators: Array<ValidateFn<T>>) => {
  if (validators.length <= 0) {
    return;
  }

  return (value: T, validatorServices: ValidatorServices) => {
    for (const validate of validators) {
      validate(value, validatorServices);
    }
  };
};
