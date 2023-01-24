/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllActionRoute } from './get_all';
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

describe('getAllActionRoute', () => {
  it('get all actions with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connectors"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [],
      }
    `);

    expect(actionsClient.getAll).toHaveBeenCalledTimes(1);

    expect(res.ok).toHaveBeenCalledWith({
      body: [],
    });
  });

  it('ensures the license allows getting all actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getAllActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connectors"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });

  it('ensures the license check prevents getting all actions', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyAccessAndContext as jest.Mock).mockImplementation(() => async () => {
      throw new Error('OMG');
    });

    getAllActionRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/actions/connectors"`);

    const actionsClient = actionsClientMock.create();
    actionsClient.getAll.mockResolvedValueOnce([]);

    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok']);

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyAccessAndContext).toHaveBeenCalledWith(licenseState, expect.any(Function));
  });
});
