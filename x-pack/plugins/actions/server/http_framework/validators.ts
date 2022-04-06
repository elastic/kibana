/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ActionType } from '../types';
import { HTTPConnectorType } from './types';

const buildSubActionParams = <Config, Secrets, Params>(
  connector: HTTPConnectorType<Config, Secrets>
) => {
  const getMethods = Object.getOwnPropertyNames(connector.Service.prototype);
  const subActions = getMethods.map((method) => {
    return schema.object({
      subAction: schema.literal(method),
      // We should somehow validate the params inside the Service
      subActionParams: schema.object({}, { unknowns: 'allow' }),
    });
  });

  return subActions;
};

export const buildValidators = <Config, Secrets, Params>({
  connector,
  configurationUtilities,
}: {
  configurationUtilities: ActionsConfigurationUtilities;
  connector: HTTPConnectorType<Config, Secrets>;
}): ActionType['validate'] => {
  const subActions = buildSubActionParams(connector);
  return {
    config: { validate: connector.schema.config.validate },
    secrets: { validate: connector.schema.secrets.validate },
    params: schema.oneOf(subActions),
  };
};
