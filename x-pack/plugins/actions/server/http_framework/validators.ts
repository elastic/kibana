/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsConfigurationUtilities } from '../actions_config';
import { ActionType } from '../types';
import { HTTPConnectorType } from './types';

const buildSubActionParams = <Config, Secrets, Params>(
  connector: HTTPConnectorType<Config, Secrets>
) => {};

export const buildValidators = <Config, Secrets, Params>({
  connector,
  configurationUtilities,
}: {
  configurationUtilities: ActionsConfigurationUtilities;
  connector: HTTPConnectorType<Config, Secrets>;
}): ActionType['validate'] => {
  return {
    config: connector.schema.config,
    secrets: connector.schema.secrets,
  };
};
