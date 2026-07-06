/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Environment } from '../../common/environment_rt';
import { ENVIRONMENT_ALL } from '../../common/environment_filter_values';
import { getPathForServiceDetail, type APMLocatorPayload } from './helpers';

const defaultOptions = {
  from: 'now-15m',
  to: 'now',
  isComparisonEnabledByDefault: false,
  defaultEnvironment: ENVIRONMENT_ALL.value,
};

const splitPath = (path: string) => {
  const [pathname, search = ''] = path.split('?');
  return {
    pathname,
    query: new URLSearchParams(search),
  };
};

describe('getPathForServiceDetail', () => {
  it('throws when the payload does not match any union branch', () => {
    expect(() =>
      getPathForServiceDetail({ serviceName: 123 } as unknown as APMLocatorPayload, defaultOptions)
    ).toThrow();
  });

  describe('when serviceName is undefined', () => {
    it('returns the service inventory link with default query params', () => {
      const path = getPathForServiceDetail({ serviceName: undefined }, defaultOptions);
      const { pathname, query } = splitPath(path);

      expect(pathname).toBe('/services');
      expect(query.get('environment')).toBe(ENVIRONMENT_ALL.value);
      expect(query.get('rangeFrom')).toBe('now-15m');
      expect(query.get('rangeTo')).toBe('now');
      expect(query.get('comparisonEnabled')).toBe('false');
      expect(query.get('kuery')).toBe('');
      expect(query.get('serviceGroup')).toBe('');
    });
  });

  describe('when dashboardId is provided', () => {
    it('routes to the dashboards page and forwards dashboardId in the query', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          dashboardId: 'dash-1',
          query: { environment: 'prod' as Environment },
        },
        defaultOptions
      );
      const { pathname, query } = splitPath(path);

      expect(pathname).toBe('/services/svc/dashboards');
      expect(query.get('dashboardId')).toBe('dash-1');
      expect(query.get('environment')).toBe('prod');
    });
  });

  describe('serviceOverviewTab routing', () => {
    const baseQuery = { environment: 'prod' as Environment };

    it.each([
      ['logs', '/services/svc/logs'],
      ['metrics', '/services/svc/metrics'],
      ['traces', '/services/svc/transactions'],
      ['transactions', '/services/svc/transactions/view'],
      ['errors', '/services/svc/errors'],
    ] as const)('routes the %s tab to %s', (serviceOverviewTab, expectedPath) => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          serviceOverviewTab,
          query: baseQuery,
        },
        defaultOptions
      );

      expect(splitPath(path).pathname).toBe(expectedPath);
    });

    it('routes to /overview when no serviceOverviewTab is provided', () => {
      const path = getPathForServiceDetail(
        { serviceName: 'svc', query: baseQuery },
        defaultOptions
      );

      expect(splitPath(path).pathname).toBe('/services/svc/overview');
    });
  });

  describe('error group deeplink', () => {
    it('routes to the error group details page when errorGroupId is provided on the errors tab', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          serviceOverviewTab: 'errors',
          errorGroupId: 'group-1',
          query: { environment: 'prod' as Environment },
        },
        defaultOptions
      );

      expect(splitPath(path).pathname).toBe('/services/svc/errors/group-1');
    });

    it('falls back to the errors list when errorGroupId is omitted', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          serviceOverviewTab: 'errors',
          query: { environment: 'prod' as Environment },
        },
        defaultOptions
      );

      expect(splitPath(path).pathname).toBe('/services/svc/errors');
    });

    it('ignores errorGroupId when serviceOverviewTab is not "errors"', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          serviceOverviewTab: 'transactions',
          errorGroupId: 'group-1',
          query: { environment: 'prod' as Environment },
        },
        defaultOptions
      );

      expect(splitPath(path).pathname).toBe('/services/svc/transactions/view');
      expect(path).not.toContain('group-1');
    });

    it('does not leak errorGroupId into the URL query string', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          serviceOverviewTab: 'errors',
          errorGroupId: 'group-1',
          query: { environment: 'prod' as Environment },
        },
        defaultOptions
      );

      expect(splitPath(path).query.get('errorGroupId')).toBeNull();
    });
  });

  describe('query merging', () => {
    it('lets payload.query override defaultQueryParams', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          query: {
            environment: 'prod' as Environment,
            kuery: 'service.name : "svc"',
            rangeFrom: 'now-1h',
            rangeTo: 'now-1m',
          },
        },
        defaultOptions
      );
      const { query } = splitPath(path);

      expect(query.get('environment')).toBe('prod');
      expect(query.get('kuery')).toBe('service.name : "svc"');
      expect(query.get('rangeFrom')).toBe('now-1h');
      expect(query.get('rangeTo')).toBe('now-1m');
    });

    it('honours isComparisonEnabledByDefault from options', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          query: { environment: 'prod' as Environment },
        },
        { ...defaultOptions, isComparisonEnabledByDefault: true }
      );

      expect(splitPath(path).query.get('comparisonEnabled')).toBe('true');
    });
  });
});
