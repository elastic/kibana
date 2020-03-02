/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IClusterClient, IRouter, IScopedClusterClient } from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../../src/core/server/mocks';
import { esFilters } from '../../../../../../src/plugins/data/server';
import { Direction } from '../../../common/types';
import { EndpointConfigSchema } from '../../config';
import { buildQueryString } from './lib';
import { alertListReqSchema } from './list/schemas';
import { registerAlertRoutes } from './index';
import { AlertSearchParams } from './types';

describe('test alerts route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    registerAlertRoutes(routerMock, {
      logFactory: loggingServiceMock.create(),
      config: () => Promise.resolve(EndpointConfigSchema.validate({})),
    });
  });

  it('should fail to validate when `page_size` is not a number', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_size: 'abc',
      });
    };
    expect(validate).toThrow();
  });

  it('should validate when `page_size` is a number', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_size: 25,
      });
    };
    expect(validate).not.toThrow();
  });

  it('should validate when `page_size` can be converted to a number', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_size: '50',
      });
    };
    expect(validate).not.toThrow();
  });

  it('should allow either `page_index` or `after`, but not both', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_index: 1,
        after: [123, 345],
      });
    };
    expect(validate).toThrow();
  });

  it('should allow either `page_index` or `before`, but not both', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_index: 1,
        before: 'abc',
      });
    };
    expect(validate).toThrow();
  });

  it('should allow either `before` or `after`, but not both', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        before: ['abc', 'def'],
        after: [123, 345],
      });
    };
    expect(validate).toThrow();
  });

  it('should correctly translate AlertSearchParams to a valid query string (with search_after)', async () => {
    const query: AlertSearchParams = {
      pageSize: 25,
      pageIndex: 2,
      query: 'agent.version:3.0.0',
      filters: [esFilters.buildEmptyFilter(true)],
      dateRange: {
        from: 'now-2h',
        to: 'now',
      },
      sort: 'process.pid',
      order: Direction.asc,
      searchAfter: ['123', '456'],
      emptyStringIsUndefined: true,
    };
    const qs = buildQueryString(query);
    expect(qs).toStrictEqual(
      'after=123&after=456&date_range=%28from%3Anow-2h%2Cto%3Anow%29&empty_string_is_undefined=true&filters=%28%27%24state%27%3A%28store%3AappState%29%2Cmeta%3A%28alias%3A%21n%2Cdisabled%3A%21f%2Cnegate%3A%21f%29%29&order=asc&page_index=2&page_size=25&query=agent.version%3A3.0.0&sort=process.pid'
    );
  });

  it('should correctly translate AlertSearchParams to a valid query string (with search_before)', async () => {
    const query: AlertSearchParams = {
      pageSize: 25,
      pageIndex: 2,
      query: 'agent.version:3.0.0',
      filters: [esFilters.buildEmptyFilter(true)],
      dateRange: {
        from: 'now-2h',
        to: 'now',
      },
      sort: 'process.pid',
      order: Direction.asc,
      searchBefore: ['123', '456'],
      emptyStringIsUndefined: true,
    };
    const qs = buildQueryString(query);
    expect(qs).toStrictEqual(
      'before=123&before=456&date_range=%28from%3Anow-2h%2Cto%3Anow%29&empty_string_is_undefined=true&filters=%28%27%24state%27%3A%28store%3AappState%29%2Cmeta%3A%28alias%3A%21n%2Cdisabled%3A%21f%2Cnegate%3A%21f%29%29&order=asc&page_index=2&page_size=25&query=agent.version%3A3.0.0&sort=process.pid'
    );
  });
});
