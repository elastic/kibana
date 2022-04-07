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

export const buildValidators = ({
  connector,
  configurationUtilities,
}: {
  configurationUtilities: ActionsConfigurationUtilities;
  connector: HTTPConnectorType;
}): ActionType['validate'] => {
  return {
    config: connector.schema.config,
    secrets: connector.schema.secrets,
    params: schema.object({
      subAction: schema.string(),
      subActionParams: schema.object({}, { unknowns: 'allow' }),
    }),
  };
};
