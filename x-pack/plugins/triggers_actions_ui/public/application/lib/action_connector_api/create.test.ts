/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionConnectorWithoutId } from '../../../types';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { createActionConnector } from '.';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('createActionConnector', () => {
  test('should call create action API', async () => {
    const apiResponse = {
      connector_type_id: 'test',
      is_preconfigured: false,
      name: 'My test',
      config: {},
      secrets: {},
      id: '123',
    };
    http.post.mockResolvedValueOnce(apiResponse);

    const connector: ActionConnectorWithoutId<{}, {}> = {
      actionTypeId: 'test',
      isPreconfigured: false,
      name: 'My test',
      config: {},
      secrets: {},
    };
    const resolvedValue = { ...connector, id: '123' };

    const result = await createActionConnector({ http, connector });
    expect(result).toEqual(resolvedValue);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/actions/connector",
        Object {
          "body": "{\\"name\\":\\"My test\\",\\"config\\":{},\\"secrets\\":{},\\"connector_type_id\\":\\"test\\",\\"is_preconfigured\\":false}",
        },
      ]
    `);
  });
});
