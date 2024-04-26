/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { rulesClientMock } from '../../../../rules_client.mock';
import { deleteBackfillRoute } from './delete_backfill_route';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('deleteBackfillRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should delete the backfill', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteBackfillRoute(router, licenseState);

    rulesClient.deleteBackfill.mockResolvedValueOnce({});
    const [config, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: { id: 'abc' } });

    expect(config.path).toEqual('/internal/alerting/rules/backfill/{id}');

    await handler(context, req, res);

    expect(rulesClient.deleteBackfill).toHaveBeenLastCalledWith('abc');
    expect(res.noContent).toHaveBeenCalledTimes(1);
  });

  test('ensures the license allows for deleting backfills', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteBackfillRoute(router, licenseState);

    rulesClient.deleteBackfill.mockResolvedValueOnce({});
    const [, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: { id: 'abc' } });
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents for deleting backfills when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteBackfillRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: { id: 'abc' } });
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
