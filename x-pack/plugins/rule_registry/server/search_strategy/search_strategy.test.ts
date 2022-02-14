/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { of } from 'rxjs';
import { merge } from 'lodash';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { ruleRegistrySearchStrategyProvider } from './search_strategy';
import { ruleDataServiceMock } from '../rule_data_plugin_service/rule_data_plugin_service.mock';
import { dataPluginMock } from '../../../../../src/plugins/data/server/mocks';
import { SearchStrategyDependencies } from '../../../../../src/plugins/data/server';
import { alertsMock } from '../../../alerting/server/mocks';
import { alertingAuthorizationMock } from '../../../alerting/server/authorization/alerting_authorization.mock';
import { securityMock } from '../../../security/server/mocks';
import { spacesMock } from '../../../spaces/server/mocks';
import { RuleRegistrySearchRequest } from '../../common/search_strategy';
import { IndexInfo } from '../rule_data_plugin_service/index_info';

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
  const alertingAuthorization = alertingAuthorizationMock.create();
  const security = securityMock.createSetup();
  const spaces = spacesMock.createStart();

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

  beforeEach(() => {
    alerting.getAlertingAuthorizationWithRequest.mockImplementation(() => {
      return {
        ...alertingAuthorization,
        getFindAuthorizationFilter: jest.fn().mockImplementation(() => {
          return { filter: [] };
        }),
      };
    });

    ruleDataService.findIndicesByFeature.mockImplementation(() => {
      return [];
    });

    data.search.getSearchStrategy.mockImplementation(() => {
      return {
        search: () => of(response),
      };
    });
  });

  afterEach(() => {
    alerting.getAlertingAuthorizationWithRequest.mockClear();
    ruleDataService.findIndicesByFeature.mockClear();
    data.search.getSearchStrategy.mockClear();
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
      security,
      spaces
    );

    const result = await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
    expect(result).toBe(response);
  });

  it('should only apply auth filters when needed', async () => {
    const request: RuleRegistrySearchRequest = {
      featureIds: [AlertConsumers.SIEM],
    };
    const options = {};
    const deps = {
      request: {},
    };

    alerting.getAlertingAuthorizationWithRequest.mockImplementation(() => {
      return {
        ...alertingAuthorization,
        getFindAuthorizationFilter: jest.fn().mockImplementation(() => {
          throw new Error('This should not be called');
        }),
      };
    });

    const strategy = ruleRegistrySearchStrategyProvider(
      data,
      ruleDataService,
      alerting,
      security,
      spaces
    );

    expect(
      async () =>
        await strategy
          .search(request, options, deps as unknown as SearchStrategyDependencies)
          .toPromise()
    ).not.toThrow();
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
      security,
      spaces
    );

    await strategy
      .search(request, options, deps as unknown as SearchStrategyDependencies)
      .toPromise();
    spaces.spacesService.getActiveSpace.mockClear();
    expect(searchRequest?.params?.index).toStrictEqual(['myTestIndex-testSpace*']);
  });
});
