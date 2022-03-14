/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from 'src/core/public/mocks';
import { triggersActionsUiConfig } from './config_api';

describe('triggersActionsUiConfig', () => {
  const http = httpServiceMock.createStartContract();

  test('should call triggersActionsUiConfig API', async () => {
    const result = await triggersActionsUiConfig({ http });
    expect(result).toEqual(undefined);
    expect(http.get.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/triggers_actions_ui/_config",
        ],
      ]
    `);
  });
});
