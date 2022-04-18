/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateActionRoute } from './update';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './legacy/_mock_handler_arguments';
import { actionsClientMock } from '../actions_client.mock';
import { verifyAccessAndContext } from './verify_access_and_context';

jest.mock('./verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('updateActionRoute', () => {
  it('updates an action with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateActionRoute(router, licenseState);

    const [config, handler] = router.put.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connector/{id}"`);

    const updateResult = {
      id: '1',
      actionTypeId: 'my-action-type-id',
      name: 'My name',
      config: { foo: true },
      isPreconfigured: false,
    };

    const actionsClient = actionsClientMock.create();
    actionsClient.update.mockResolvedValueOnce(updateResult);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: {
        id: '1',
        connector_type_id: 'my-action-type-id',
        name: 'My name',
        config: { foo: true },
        is_preconfigured: false,
      },
    });

    expect(actionsClient.update).toHaveBeenCalledTimes(1);
    expect(actionsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": Object {
            "config": Object {
              "foo": true,
            },
            "name": "My name",
            "secrets": Object {
              "key": "i8oh34yf9783y39",
            },
          },
          "id": "1",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows deleting actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateActionRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    const updateResult = {
      id: '1',
      actionTypeId: 'my-action-type-id',
      name: 'My name',
      config: { foo: true },
      isPreconfigured: false,
    };

    const actionsClient = actionsClientMock.create();
    actionsClient.update.mockResolvedValueOnce(updateResult);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents deleting actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    updateActionRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    const updateResult = {
      id: '1',
      actionTypeId: 'my-action-type-id',
      name: 'My name',
      config: { foo: true },
      isPreconfigured: false,
    };

    const actionsClient = actionsClientMock.create();
    actionsClient.update.mockResolvedValueOnce(updateResult);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
