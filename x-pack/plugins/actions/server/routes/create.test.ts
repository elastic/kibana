/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionRoute } from './create';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './legacy/_mock_handler_arguments';
import { actionsClientMock } from '../actions_client.mock';
import { verifyAccessAndContext } from './verify_access_and_context';
import { omit } from 'lodash';

jest.mock('./verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('createActionRoute', () => {
  it('creates an action with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    createActionRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connector"`);

    const createResult = {
      id: '1',
      name: 'My name',
      actionTypeId: 'abc',
      config: { foo: true },
      isPreconfigured: false,
      isMissingSecrets: false,
    };

    const createApiResult = {
      ...omit(createResult, ['actionTypeId', 'isPreconfigured', 'isMissingSecrets']),
      connector_type_id: createResult.actionTypeId,
      is_preconfigured: createResult.isPreconfigured,
      is_missing_secrets: createResult.isMissingSecrets,
    };

    const actionsClient = actionsClientMock.create();
    actionsClient.create.mockResolvedValueOnce(createResult);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {
          name: 'My name',
          connector_type_id: 'abc',
          config: { foo: true },
          secrets: {},
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: createApiResult });

    expect(actionsClient.create).toHaveBeenCalledTimes(1);
    expect(actionsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": Object {
            "actionTypeId": "abc",
            "config": Object {
              "foo": true,
            },
            "name": "My name",
            "secrets": Object {},
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: createApiResult,
    });
  });

  it('ensures the license allows creating actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    createActionRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.create.mockResolvedValueOnce({
      id: '1',
      name: 'My name',
      actionTypeId: 'abc',
      isMissingSecrets: false,
      config: { foo: true },
      isPreconfigured: false,
    });

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {
          name: 'My name',
          connector_type_id: 'abc',
          config: { foo: true },
          secrets: {},
        },
      }
    );

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents creating actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    createActionRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.create.mockResolvedValueOnce({
      id: '1',
      name: 'My name',
      actionTypeId: 'abc',
      config: { foo: true },
      isMissingSecrets: false,
      isPreconfigured: false,
    });

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {
          name: 'My name',
          connector_type_id: 'abc',
          config: { foo: true },
          secrets: {},
        },
      }
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);
  });
});
