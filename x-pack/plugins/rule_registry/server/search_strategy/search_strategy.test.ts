/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lastValueFrom, of } from 'rxjs';
import { merge } from 'lodash';
import { loggerMock } from '@kbn/logging-mocks';
import { ALERT_EVENTS_FIELDS } from '@kbn/alerts-as-data-utils';
import { ruleRegistrySearchStrategyProvider, EMPTY_RESPONSE } from './search_strategy';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { SearchStrategyDependencies } from '@kbn/data-plugin/server';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import type { RuleRegistrySearchRequest } from '../../common';
import * as getAuthzFilterImport from '../lib/get_authz_filter';
import { getIsKibanaRequest } from '../lib/get_is_kibana_request';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { Boom } from '@hapi/boom';
import { KbnSearchError } from '@kbn/data-plugin/server/search/report_search_error';

jest.mock('../lib/get_is_kibana_request');

const getBasicResponse = (overwrites = {}) => {
  return merge(
    {
      isPartial: false,
      isRunning: false,
      total: 0,
      loaded: 0,
      rawResponse: {
        took: 1,
        timed_out: false,
        _shards: {
          failed: 0,
          successful: 1,
          total: 1,
        },
        hits: {
          max_score: 0,
          hits: [],
          total: 0,
        },
      },
    },
    overwrites
  );
};

describe('ruleRegistrySearchStrategyProvider()', () => {
  const data = dataPluginMock.createStartContract();
  const alerting = alertsMock.createStart();
  const security = securityMock.createSetup();
  const spaces = spacesMock.createStart();
  const logger = loggerMock.create();
  const getAuthorizedRuleTypesMock = jest.fn();
  const getAlertIndicesAliasMock = jest.fn();
  const response = getBasicResponse({
    rawResponse: {
      hits: {
        hits: [
          {
            _source: {
              foo: 1,
            },
          },
        ],
      },
    },
  });

  let getAuthzFilterSpy: jest.SpyInstance;
  const searchStrategySearch = jest.fn().mockImplementation(() => of(response));

  beforeEach(() => {
    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['test']);
    const authorizationMock = alertingAuthorizationMock.create();
    alerting.getAlertingAuthorizationWithRequest.mockResolvedValue(authorizationMock);
    alerting.getAlertIndicesAlias = getAlertIndicesAliasMock;
    alerting.listTypes.mockReturnValue(
      // @ts-expect-error: rule type properties are not needed for the test
      new Map([
        ['.es-query', {}],
        ['siem.esqlRule', {}],
      ])
    );

    data.search.getSearchStrategy.mockImplementation(() => {
      return {
        search: searchStrategySearch,
      };
    });

    (data.search.searchAsInternalUser.search as jest.Mock).mockImplementation(() => {
      return of(response);
    });

    (getIsKibanaRequest as jest.Mock).mockImplementation(() => {
      return true;
    });

    getAuthzFilterSpy = jest
      .spyOn(getAuthzFilterImport, 'getAuthzFilter')
      .mockImplementation(async () => {
        return {};
      });
  });

  afterEach(() => {
    getAuthorizedRuleTypesMock.mockClear();
    getAlertIndicesAliasMock.mockClear();
    data.search.getSearchStrategy.mockClear();
    (data.search.searchAsInternalUser.search as jest.Mock).mockClear();
    getAuthzFilterSpy.mockClear();
    searchStrategySearch.mockClear();
  });

  it('should handle a basic search request', async () => {
    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['observability-logs']);
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['.es-query'],
    };
    const options = {};
    const deps = {
      request: {},
    };

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    const result = await lastValueFrom(
      strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
    );

    expect(result).toEqual(response);
  });

  it('should return an empty response if no valid indices are found', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['.es-query'],
    };
    const options = {};
    const deps = {
      request: {},
    };

    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue([]);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    const result = await lastValueFrom(
      strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
    );

    expect(result).toBe(EMPTY_RESPONSE);
  });

  it('should not apply rbac filters for siem rule types', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['siem.esqlRule'],
    };
    const options = {};
    const deps = {
      request: {},
    };

    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['security-siem']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await lastValueFrom(
      strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
    );

    expect(getAuthzFilterSpy).not.toHaveBeenCalled();
  });

  it('should throw an error if requesting multiple rule types and one is for siem', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['.es-query', 'siem.esqlRule'],
    };
    const options = {};
    const deps = {
      request: {},
    };

    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['security-siem', 'o11y-logs']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    let err;

    try {
      await lastValueFrom(
        strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
      );
    } catch (e) {
      err = e;
    }

    expect(err.statusCode).toBe(400);
    expect(err.message).toBe(
      'The privateRuleRegistryAlertsSearchStrategy search strategy is unable to accommodate requests containing multiple rule types with mixed authorization.'
    );
  });

  it('should not throw an error with empty rule type ids', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: [],
    };

    const options = {};
    const deps = {
      request: {},
    };

    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue([]);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await expect(
      lastValueFrom(
        strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
      )
    ).resolves.not.toThrow();
  });

  it('should use internal user when requesting o11y alerts as RBAC is applied', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['.es-query'],
    };
    const options = {};
    const deps = {
      request: {},
    };
    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['o11y-logs']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await lastValueFrom(
      strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
    );

    expect(data.search.searchAsInternalUser.search).toHaveBeenCalled();
    expect(searchStrategySearch).not.toHaveBeenCalled();
  });

  it('should use scoped user when requesting siem alerts as RBAC is not applied', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['siem.esqlRule'],
    };
    const options = {};
    const deps = {
      request: {},
    };

    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['security-siem']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await lastValueFrom(
      strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
    );

    expect(data.search.searchAsInternalUser.search as jest.Mock).not.toHaveBeenCalled();
    expect(searchStrategySearch).toHaveBeenCalled();
  });

  it('should support pagination', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['.es-query'],
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    };
    const options = {};
    const deps = {
      request: {},
    };
    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['o11y-logs']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await lastValueFrom(
      strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
    );

    expect((data.search.searchAsInternalUser.search as jest.Mock).mock.calls.length).toBe(1);
    expect(
      (data.search.searchAsInternalUser.search as jest.Mock).mock.calls[0][0].params.body.size
    ).toBe(10);
    expect(
      (data.search.searchAsInternalUser.search as jest.Mock).mock.calls[0][0].params.body.from
    ).toBe(0);
  });

  it('should support sorting', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['.es-query'],
      sort: [
        {
          test: {
            order: 'desc',
          },
        },
      ],
    };
    const options = {};
    const deps = {
      request: {},
    };
    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['o11y-logs']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await lastValueFrom(
      strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
    );

    expect((data.search.searchAsInternalUser.search as jest.Mock).mock.calls.length).toBe(1);
    expect(
      (data.search.searchAsInternalUser.search as jest.Mock).mock.calls[0][0].params.body.sort
    ).toStrictEqual([{ test: { order: 'desc' } }]);
  });

  it('passes the query ids if provided', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['siem.esqlRule'],
      query: {
        ids: { values: ['test-id'] },
      },
    };
    const options = {};
    const deps = {
      request: {},
    };
    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['security-siem']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await lastValueFrom(
      strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
    );

    const arg0 = searchStrategySearch.mock.calls[0][0];
    expect(arg0.params.body.fields.length).toEqual(
      // +2 because of fields.push({ field: 'kibana.alert.*', include_unmapped: false }); and
      // fields.push({ field: 'signal.*', include_unmapped: false });
      ALERT_EVENTS_FIELDS.length + 2
    );

    expect.arrayContaining([
      expect.objectContaining({
        x: 2,
        y: 3,
      }),
    ]);

    expect(arg0).toEqual(
      expect.objectContaining({
        id: undefined,
        params: expect.objectContaining({
          allow_no_indices: true,
          body: expect.objectContaining({
            _source: false,
            fields: expect.arrayContaining([
              expect.objectContaining({
                field: '@timestamp',
                include_unmapped: true,
              }),
            ]),
            from: 0,
            query: {
              ids: {
                values: ['test-id'],
              },
            },
            size: 1000,
            sort: [],
          }),
          ignore_unavailable: true,
          index: ['security-siem'],
        }),
      })
    );
  });

  it('passes the fields if provided', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['siem.esqlRule'],
      query: {
        ids: { values: ['test-id'] },
      },
      fields: [{ field: 'my-super-field', include_unmapped: true }],
    };
    const options = {};
    const deps = {
      request: {},
    };
    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['security-siem']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await lastValueFrom(
      strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
    );

    const arg0 = searchStrategySearch.mock.calls[0][0];
    expect(arg0.params.body.fields.length).toEqual(
      // +2 because of fields.push({ field: 'kibana.alert.*', include_unmapped: false }); and
      // fields.push({ field: 'signal.*', include_unmapped: false }); + my-super-field
      ALERT_EVENTS_FIELDS.length + 3
    );

    expect(arg0).toEqual(
      expect.objectContaining({
        id: undefined,
        params: expect.objectContaining({
          allow_no_indices: true,
          body: expect.objectContaining({
            _source: false,
            fields: expect.arrayContaining([
              expect.objectContaining({
                field: 'my-super-field',
                include_unmapped: true,
              }),
            ]),
            from: 0,
            query: {
              ids: {
                values: ['test-id'],
              },
            },
            size: 1000,
            sort: [],
          }),
          ignore_unavailable: true,
          index: ['security-siem'],
        }),
      })
    );
  });

  it('should handle Boom errors correctly', async () => {
    getAuthzFilterSpy.mockRejectedValue(new Boom('boom error message', { statusCode: 400 }));

    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['.es-query'],
    };

    const options = {};
    const deps = {
      request: {},
    };

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    let err;

    try {
      await lastValueFrom(
        strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
      );
    } catch (e) {
      err = e;
    }

    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('boom error message');
  });

  it('should handle KbnSearchError errors correctly', async () => {
    getAuthzFilterSpy.mockRejectedValue(new KbnSearchError('kbn search error message', 403));

    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['.es-query'],
    };

    const options = {};
    const deps = {
      request: {},
    };

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    let err;

    try {
      await lastValueFrom(
        strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
      );
    } catch (e) {
      err = e;
    }

    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('kbn search error message');
  });

  it('should convert errors to KbnSearchError errors correctly', async () => {
    getAuthzFilterSpy.mockRejectedValue(new Error('plain error message'));

    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['.es-query'],
    };

    const options = {};
    const deps = {
      request: {},
    };

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    let err;

    try {
      await lastValueFrom(
        strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
      );
    } catch (e) {
      err = e;
    }

    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('plain error message');
  });

  it('should apply the rule type IDs filter', async () => {
    const request: RuleRegistrySearchRequest = {
      ruleTypeIds: ['siem.esqlRule'],
    };

    const options = {};
    const deps = {
      request: {},
    };

    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['security-siem']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await lastValueFrom(
      strategy.search(request, options, deps as unknown as SearchStrategyDependencies)
    );

    const arg0 = searchStrategySearch.mock.calls[0][0];
    expect(arg0.params.body.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "terms": Object {
                "kibana.alert.rule.rule_type_id": Array [
                  "siem.esqlRule",
                ],
              },
            },
          ],
        },
      }
    `);
  });
});
