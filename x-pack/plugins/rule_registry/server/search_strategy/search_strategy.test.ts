/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { of } from 'rxjs';
import { merge } from 'lodash';
import { loggerMock } from '@kbn/logging-mocks';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { ALERT_EVENTS_FIELDS } from '@kbn/alerts-as-data-utils';
import { ruleRegistrySearchStrategyProvider, EMPTY_RESPONSE } from './search_strategy';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { SearchStrategyDependencies } from '@kbn/data-plugin/server';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { RuleRegistrySearchRequest } from '../../common/search_strategy';
import * as getAuthzFilterImport from '../lib/get_authz_filter';
import { getIsKibanaRequest } from '../lib/get_is_kibana_request';

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
    const authorizationMock = {
      getAuthorizedRuleTypes: getAuthorizedRuleTypesMock,
    } as never;
    alerting.getAlertingAuthorizationWithRequest.mockResolvedValue(authorizationMock);
    alerting.getAlertIndicesAlias = getAlertIndicesAliasMock;

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
      featureIds: [AlertConsumers.LOGS],
    };
    const options = {};
    const deps = {
      request: {},
    };

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    const result = await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();

    expect(result).toEqual(response);
  });

  it('should return an empty response if no valid indices are found', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.LOGS],
    };
    const options = {};
    const deps = {
      request: {},
    };

    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue([]);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    const result = await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
    expect(result).toBe(EMPTY_RESPONSE);
  });

  it('should not apply rbac filters for siem', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.SIEM],
    };
    const options = {};
    const deps = {
      request: {},
    };

    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['security-siem']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
    expect(getAuthzFilterSpy).not.toHaveBeenCalled();
  });

  it('should throw an error if requesting multiple featureIds and one is SIEM', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.SIEM, AlertConsumers.LOGS],
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
      await strategy
        .search(request, options, deps as unknown as SearchStrategyDependencies)
        .toPromise();
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
  });

  it('should use internal user when requesting o11y alerts as RBAC is applied', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.LOGS],
    };
    const options = {};
    const deps = {
      request: {},
    };
    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['o11y-logs']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
    expect(data.search.searchAsInternalUser.search).toHaveBeenCalled();
    expect(searchStrategySearch).not.toHaveBeenCalled();
  });

  it('should use scoped user when requesting siem alerts as RBAC is not applied', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.SIEM],
    };
    const options = {};
    const deps = {
      request: {},
    };

    getAuthorizedRuleTypesMock.mockResolvedValue([]);
    getAlertIndicesAliasMock.mockReturnValue(['security-siem']);

    const strategy = ruleRegistrySearchStrategyProvider(data, alerting, logger, security, spaces);

    await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
    expect(data.search.searchAsInternalUser.search as jest.Mock).not.toHaveBeenCalled();
    expect(searchStrategySearch).toHaveBeenCalled();
  });

  it('should support pagination', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.LOGS],
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

    await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
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
      featureIds: [AlertConsumers.LOGS],
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

    await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
    expect((data.search.searchAsInternalUser.search as jest.Mock).mock.calls.length).toBe(1);
    expect(
      (data.search.searchAsInternalUser.search as jest.Mock).mock.calls[0][0].params.body.sort
    ).toStrictEqual([{ test: { order: 'desc' } }]);
  });

  it('passes the query ids if provided', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.SIEM],
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

    await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
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
      featureIds: [AlertConsumers.SIEM],
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

    await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();

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
});
