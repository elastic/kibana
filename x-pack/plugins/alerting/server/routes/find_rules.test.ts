/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { usageCountersServiceMock } from 'src/plugins/usage_collection/server/usage_counters/usage_counters_service.mock';
import { findRulesRoute } from './find_rules';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';
import { trackLegacyTerminology } from './lib/track_legacy_terminology';

const rulesClient = rulesClientMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

jest.mock('./lib/track_legacy_terminology', () => ({
  trackLegacyTerminology: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('findRulesRoute', () => {
  it('finds rules with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rules/_find"`);

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "data": Array [],
          "page": 1,
          "per_page": 1,
          "total": 0,
        },
      }
    `);

    expect(rulesClient.find).toHaveBeenCalledTimes(1);
    expect(rulesClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "excludeFromPublicApi": true,
          "options": Object {
            "defaultSearchOperator": "OR",
            "page": 1,
            "perPage": 1,
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        page: 1,
        per_page: 1,
        total: 0,
        data: [],
      },
    });
  });

  it('ensures the license allows finding rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.find.mockResolvedValueOnce({
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    });

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents finding rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    findRulesRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('should track calls with deprecated param values', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState, mockUsageCounter);
    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {},
        query: {
          search_fields: ['alertTypeId:1', 'message:foo'],
          search: 'alertTypeId:2',
          sort_field: 'alertTypeId',
        },
      },
      ['ok']
    );
    await handler(context, req, res);
    expect(trackLegacyTerminology).toHaveBeenCalledTimes(1);
    expect((trackLegacyTerminology as jest.Mock).mock.calls[0][0]).toStrictEqual([
      'alertTypeId:2',
      ['alertTypeId:1', 'message:foo'],
      'alertTypeId',
    ]);
  });

  it('should track calls to deprecated functionality', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findRulesRoute(router, licenseState, mockUsageCounter);

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    rulesClient.find.mockResolvedValueOnce(findResult);

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {},
        query: {
          fields: ['foo', 'bar'],
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );
    await handler(context, req, res);
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: `alertingFieldsUsage`,
      counterType: 'alertingFieldsUsage',
      incrementBy: 1,
    });
  });
});
