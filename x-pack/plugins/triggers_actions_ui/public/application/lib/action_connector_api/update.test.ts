/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionConnectorWithoutId } from '../../../types';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { updateActionConnector } from '.';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('updateActionConnector', () => {
  test('should call the update API', async () => {
    const id = '12/3';
    const apiResponse = {
      connector_type_id: 'te/st',
      is_preconfigured: false,
      name: 'My test',
      config: {},
      secrets: {},
      id,
    };
    http.put.mockResolvedValueOnce(apiResponse);

    const connector: ActionConnectorWithoutId<{}, {}> = {
      actionTypeId: 'te/st',
      isPreconfigured: false,
      name: 'My test',
      config: {},
      secrets: {},
    };
    const resolvedValue = { ...connector, id };

    const result = await updateActionConnector({ http, connector, id });
    expect(result).toEqual(resolvedValue);
    expect(http.put.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/actions/connector/12%2F3",
        Object {
          "body": "{\\"name\\":\\"My test\\",\\"config\\":{},\\"secrets\\":{}}",
        },
      ]
    `);
  });
});
