/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { triggersActionsUiHealth } from './health_api';

describe('triggersActionsUiHealth', () => {
  const http = httpServiceMock.createStartContract();

  test('should call triggersActionsUiHealth API', async () => {
    const result = await triggersActionsUiHealth({ http });
    expect(result).toEqual(undefined);
    expect(http.get.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/triggers_actions_ui/_health",
        ],
      ]
    `);
  });
});
