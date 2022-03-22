/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActionsConfig } from './get_actions_config';

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

describe('get actions config', () => {
  test('returns the connector type specific config and keeps the default values that are not overridden', () => {
    expect(
      getActionsConfig({
        actionsConfig,
        connectorTypeId,
      })
    ).toEqual({
      max: 1000,
    });
  });

  test('applies the connector type specific config', () => {
    expect(
      getActionsConfig({
        actionsConfig: actionsConfigWithConnectorType,
        connectorTypeId,
      })
    ).toEqual({
      max: 20,
    });
  });
});
