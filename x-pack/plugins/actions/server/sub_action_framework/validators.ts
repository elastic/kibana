/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ActionTypeConfig, ActionTypeSecrets } from '../types';
import { SubActionConnectorType } from './types';

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
  return {
    config: connector.schema.config,
    secrets: connector.schema.secrets,
    params: schema.object({
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
  };
};
