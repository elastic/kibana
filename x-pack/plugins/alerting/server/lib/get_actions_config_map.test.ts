/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActionsConfigMap } from './get_actions_config_map';

const connectorTypeId = 'test-connector-type-id';
const actionsConfig = {
  max: 1000,
};

const actionsConfigWithConnectorType = {
  ...actionsConfig,
  connectorTypeOverrides: [
    {
      id: connectorTypeId,
      max: 20,
    },
  ],
};

describe('get actions config map', () => {
  test('returns the default actions config', () => {
    expect(getActionsConfigMap(actionsConfig)).toEqual({
      default: {
        max: 1000,
      },
    });
  });

  test('applies the connector type specific config', () => {
    expect(getActionsConfigMap(actionsConfigWithConnectorType)).toEqual({
      default: {
        max: 1000,
      },
      [connectorTypeId]: {
        max: 20,
      },
    });
  });
});
