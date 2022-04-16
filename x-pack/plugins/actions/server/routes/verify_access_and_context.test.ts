/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess, ActionTypeDisabledError } from '../lib';
import { mockHandlerArguments } from './legacy/_mock_handler_arguments';
import { actionsClientMock } from '../actions_client.mock';
import { verifyAccessAndContext } from './verify_access_and_context';

jest.mock('../lib/verify_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('verifyAccessAndContext', () => {
  it('ensures the license allows creating actions', async () => {
    const licenseState = licenseStateMock.create();

    const handler = jest.fn();
    const verify = verifyAccessAndContext(licenseState, handler);

    const actionsClient = actionsClientMock.create();
    const [context, req, res] = mockHandlerArguments({ actionsClient }, {});

    await verify(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents creating actions', async () => {
    const licenseState = licenseStateMock.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    const handler = jest.fn();
    const verify = verifyAccessAndContext(licenseState, handler);

    const actionsClient = actionsClientMock.create();
    const [context, req, res] = mockHandlerArguments({ actionsClient }, {});

    await expect(verify(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('supports error that handle their own response', async () => {
    const licenseState = licenseStateMock.create();

    const handler = jest.fn();
    const verify = verifyAccessAndContext(licenseState, handler);

    const actionsClient = actionsClientMock.create();
    const [context, req, res] = mockHandlerArguments({ actionsClient }, {}, ['ok', 'forbidden']);

    handler.mockRejectedValue(new ActionTypeDisabledError('Fail', 'license_invalid'));

    await expect(verify(context, req, res)).resolves.toMatchObject({ body: { message: 'Fail' } });
    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
