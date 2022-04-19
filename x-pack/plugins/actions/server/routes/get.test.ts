/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActionRoute } from './get';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './legacy/_mock_handler_arguments';
import { actionsClientMock } from '../actions_client.mock';
import { verifyAccessAndContext } from './verify_access_and_context';

jest.mock('./verify_access_and_context.ts', () => ({
  verifyAccessAndContext: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('getActionRoute', () => {
  it('gets an action with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connector/{id}"`);

    const getResult = {
      id: '1',
      actionTypeId: '2',
      name: 'action name',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
      isMissingSecrets: false,
    };

    const actionsClient = actionsClientMock.create();
    actionsClient.get.mockResolvedValueOnce(getResult);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "config": Object {},
          "connector_type_id": "2",
          "id": "1",
          "is_missing_secrets": false,
          "is_preconfigured": false,
          "is_deprecated": false,
          "name": "action name",
        },
      }
    `);

    expect(actionsClient.get).toHaveBeenCalledTimes(1);
    expect(actionsClient.get.mock.calls[0][0].id).toEqual('1');

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        id: '1',
        connector_type_id: '2',
        name: 'action name',
        config: {},
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
      },
    });
  });

  it('ensures the license allows getting actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getActionRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.get.mockResolvedValueOnce({
      id: '1',
      actionTypeId: '2',
      name: 'action name',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    });

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents getting actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    getActionRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const actionsClient = actionsClientMock.create();
    actionsClient.get.mockResolvedValueOnce({
      id: '1',
      actionTypeId: '2',
      name: 'action name',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    });

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
