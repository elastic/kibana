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
import {
  ruleRegistrySearchStrategyProvider,
  EMPTY_RESPONSE,
  RULE_SEARCH_STRATEGY_NAME,
} from './search_strategy';
import { ruleDataServiceMock } from '../rule_data_plugin_service/rule_data_plugin_service.mock';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { SearchStrategyDependencies } from '@kbn/data-plugin/server';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { RuleRegistrySearchRequest } from '../../common/search_strategy';
import { IndexInfo } from '../rule_data_plugin_service/index_info';
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
  const ruleDataService = ruleDataServiceMock.create();
  const alerting = alertsMock.createStart();
  const security = securityMock.createSetup();
  const spaces = spacesMock.createStart();
  const logger = loggerMock.create();

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
    ruleDataService.findIndicesByFeature.mockImplementation(() => {
      return [
        {
          baseName: 'test',
        } as IndexInfo,
      ];
    });

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
    ruleDataService.findIndicesByFeature.mockClear();
    data.search.getSearchStrategy.mockClear();
    (data.search.searchAsInternalUser.search as jest.Mock).mockClear();
    getAuthzFilterSpy.mockClear();
    searchStrategySearch.mockClear();
  });

  it('should handle a basic search request', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.LOGS],
    };
    const options = {};
    const deps = {
      request: {},
    };

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      logger,
      security,
      spaces
    );

    const result = await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
    expect(result).toBe(response);
  });

  it('should use the active space in siem queries', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.SIEM],
    };
    const options = {};
    const deps = {
      request: {},
    };

    spaces.spacesService.getActiveSpace.mockImplementation(async () => {
      return {
        id: 'testSpace',
        name: 'Test Space',
        disabledFeatures: [],
      };
    });

    ruleDataService.findIndicesByFeature.mockImplementation(() => {
      return [
        {
          baseName: 'myTestIndex',
        } as unknown as IndexInfo,
      ];
    });

    let searchRequest: RuleRegistrySearchRequest = {} as unknown as RuleRegistrySearchRequest;
    data.search.getSearchStrategy.mockImplementation(() => {
      return {
        search: (_request) => {
          searchRequest = _request as unknown as RuleRegistrySearchRequest;
          return of(response);
        },
      };
    });

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      logger,
      security,
      spaces
    );

    await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
    spaces.spacesService.getActiveSpace.mockClear();
    expect(searchRequest?.params?.index).toStrictEqual(['myTestIndex-testSpace*']);
  });

  it('should return an empty response if no valid indices are found', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.LOGS],
    };
    const options = {};
    const deps = {
      request: {},
    };

    ruleDataService.findIndicesByFeature.mockImplementationOnce(() => {
      return [];
    });

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      logger,
      security,
      spaces
    );

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

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      logger,
      security,
      spaces
    );

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

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      logger,
      security,
      spaces
    );

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

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      logger,
      security,
      spaces
    );

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

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      logger,
      security,
      spaces
    );

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

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      logger,
      security,
      spaces
    );

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

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      logger,
      security,
      spaces
    );

    await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
    expect((data.search.searchAsInternalUser.search as jest.Mock).mock.calls.length).toBe(1);
    expect(
      (data.search.searchAsInternalUser.search as jest.Mock).mock.calls[0][0].params.body.sort
    ).toStrictEqual([{ test: { order: 'desc' } }]);
  });

  it('should reject, to the best of our ability, public requests', async () => {
    (getIsKibanaRequest as jest.Mock).mockImplementation(() => {
      return false;
    });
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

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      logger,
      security,
      spaces
    );

    let err = null;
    try {
      await strategy
        .search(request, options, deps as unknown as SearchStrategyDependencies)
        .toPromise();
    } catch (e) {
      err = e;
    }
    expect(err).not.toBeNull();
    expect(err.message).toBe(
      `The ${RULE_SEARCH_STRATEGY_NAME} search strategy is currently only available for internal use.`
    );
  });
});
