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
import { transformRequestV1, transformResponseV1 } from './transforms';
import { rulesClientMock } from '../../../../rules_client.mock';
import { findBackfillRoute } from './find_backfill_route';
import { FindBackfillResult } from '../../../../application/backfill/methods/find/types';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

describe('findBackfillRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockFindOptions = {
    page: 1,
    per_page: 10,
    rule_ids: 'abc',
  };

  const mockFindResult: FindBackfillResult = {
    page: 0,
    perPage: 10,
    total: 1,
    data: [
      {
        id: 'abc',
        createdAt: '2024-01-30T00:00:00.000Z',
        duration: '12h',
        enabled: true,
        rule: {
          name: 'my rule name',
          tags: ['foo'],
          alertTypeId: 'myType',
          params: {},
          apiKeyOwner: 'user',
          apiKeyCreatedByUser: false,
          consumer: 'myApp',
          enabled: true,
          schedule: { interval: '12h' },
          createdBy: 'user',
          updatedBy: 'user',
          createdAt: '2019-02-12T21:01:22.479Z',
          updatedAt: '2019-02-12T21:01:22.479Z',
          revision: 0,
          id: '1',
        },
        spaceId: 'default',
        start: '2023-11-16T08:00:00.000Z',
        status: 'pending',
        schedule: [{ runAt: '2023-11-16T20:00:00.000Z', interval: '12h', status: 'pending' }],
      },
      {
        id: 'def',
        createdAt: '2024-01-30T00:00:00.000Z',
        duration: '12h',
        enabled: true,
        rule: {
          name: 'my rule name',
          tags: ['foo'],
          alertTypeId: 'myType',
          params: {},
          apiKeyOwner: 'user',
          apiKeyCreatedByUser: false,
          consumer: 'myApp',
          enabled: true,
          schedule: { interval: '12h' },
          createdBy: 'user',
          updatedBy: 'user',
          createdAt: '2019-02-12T21:01:22.479Z',
          updatedAt: '2019-02-12T21:01:22.479Z',
          revision: 0,
          id: '2',
        },
        spaceId: 'default',
        start: '2023-11-16T08:00:00.000Z',
        status: 'pending',
        schedule: [
          { runAt: '2023-11-16T20:00:00.000Z', interval: '12h', status: 'pending' },
          { runAt: '2023-11-17T08:00:00.000Z', interval: '12h', status: 'pending' },
        ],
      },
    ],
  };

  test('should find backfills with the proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findBackfillRoute(router, licenseState);

    rulesClient.findBackfill.mockResolvedValueOnce(mockFindResult);
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { query: mockFindOptions });

    expect(config.path).toEqual('/internal/alerting/rules/backfill/_find');

    await handler(context, req, res);

    expect(rulesClient.findBackfill).toHaveBeenLastCalledWith(transformRequestV1(mockFindOptions));
    expect(res.ok).toHaveBeenLastCalledWith({
      body: transformResponseV1(mockFindResult),
    });
  });

  test('ensures the license allows for finding backfills', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findBackfillRoute(router, licenseState);

    rulesClient.findBackfill.mockResolvedValueOnce(mockFindResult);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { query: mockFindOptions });
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents for finding backfills when appropriate', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findBackfillRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: mockFindOptions });
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
