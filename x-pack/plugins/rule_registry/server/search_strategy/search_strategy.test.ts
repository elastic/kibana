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
import { ruleRegistrySearchStrategyProvider, EMPTY_RESPONSE } from './search_strategy';
import { ruleDataServiceMock } from '../rule_data_plugin_service/rule_data_plugin_service.mock';
import { dataPluginMock } from '../../../../../src/plugins/data/server/mocks';
import { SearchStrategyDependencies } from '../../../../../src/plugins/data/server';
import { alertsMock } from '../../../alerting/server/mocks';
import { securityMock } from '../../../security/server/mocks';
import { spacesMock } from '../../../spaces/server/mocks';
import { RuleRegistrySearchRequest } from '../../common/search_strategy';
import { IndexInfo } from '../rule_data_plugin_service/index_info';
import * as getAuthzFilterImport from '../lib/get_authz_filter';

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
        search: () => of(response),
      };
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
    getAuthzFilterSpy.mockClear();
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
});
