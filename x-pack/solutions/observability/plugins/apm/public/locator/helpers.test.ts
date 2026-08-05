/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
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
      ['alerts', '/services/svc/alerts'],
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

    it('forwards comparisonEnabled and offset to the error group deep-link', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          serviceOverviewTab: 'errors',
          errorGroupId: 'group-1',
          query: {
            environment: 'prod' as Environment,
            comparisonEnabled: true,
            offset: 'expected_bounds',
          },
        },
        defaultOptions
      );
      const { query } = splitPath(path);

      expect(query.get('comparisonEnabled')).toBe('true');
      expect(query.get('offset')).toBe('expected_bounds');
    });
  });

  describe('isMobileAgentName routing', () => {
    const baseQuery = { environment: 'prod' as Environment };

    it('routes to the mobile overview when no tab is provided', () => {
      const path = getPathForServiceDetail(
        { serviceName: 'svc', isMobileAgentName: true, query: baseQuery },
        defaultOptions
      );

      expect(splitPath(path).pathname).toBe('/mobile-services/svc/overview');
    });

    it.each([
      ['alerts', '/mobile-services/svc/alerts'],
      ['logs', '/mobile-services/svc/logs'],
      ['traces', '/mobile-services/svc/transactions'],
    ] as const)('routes the %s tab to the mobile path', (serviceOverviewTab, expectedPath) => {
      const path = getPathForServiceDetail(
        { serviceName: 'svc', isMobileAgentName: true, serviceOverviewTab, query: baseQuery },
        defaultOptions
      );

      expect(splitPath(path).pathname).toBe(expectedPath);
    });

    it('falls back to the regular path for tabs without a mobile equivalent', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          isMobileAgentName: true,
          serviceOverviewTab: 'metrics',
          query: baseQuery,
        },
        defaultOptions
      );

      expect(splitPath(path).pathname).toBe('/services/svc/metrics');
    });
  });

  describe('anomaly param forwarding', () => {
    it('forwards comparisonEnabled from payload, overriding the default', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          query: {
            environment: 'prod' as Environment,
            comparisonEnabled: true,
          },
        },
        { ...defaultOptions, isComparisonEnabledByDefault: false }
      );

      expect(splitPath(path).query.get('comparisonEnabled')).toBe('true');
    });

    it('falls back to isComparisonEnabledByDefault when comparisonEnabled is not in payload', () => {
      const path = getPathForServiceDetail(
        { serviceName: 'svc', query: { environment: 'prod' as Environment } },
        { ...defaultOptions, isComparisonEnabledByDefault: true }
      );

      expect(splitPath(path).query.get('comparisonEnabled')).toBe('true');
    });

    it('forwards offset and anomalyThreshold to the overview URL', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          query: {
            environment: 'prod' as Environment,
            offset: 'expected_bounds',
            anomalyThreshold: ML_ANOMALY_SEVERITY.CRITICAL,
          },
        },
        defaultOptions
      );
      const { pathname, query } = splitPath(path);

      expect(pathname).toBe('/services/svc/overview');
      expect(query.get('offset')).toBe('expected_bounds');
      expect(query.get('anomalyThreshold')).toBe('critical');
    });

    it('forwards offset and anomalyThreshold to the mobile overview URL', () => {
      const path = getPathForServiceDetail(
        {
          serviceName: 'svc',
          isMobileAgentName: true,
          query: {
            environment: 'prod' as Environment,
            offset: 'expected_bounds',
            anomalyThreshold: ML_ANOMALY_SEVERITY.MAJOR,
          },
        },
        defaultOptions
      );
      const { pathname, query } = splitPath(path);

      expect(pathname).toBe('/mobile-services/svc/overview');
      expect(query.get('offset')).toBe('expected_bounds');
      expect(query.get('anomalyThreshold')).toBe('major');
    });

    it.each(['alerts', 'logs', 'metrics', 'traces', 'transactions', 'errors'] as const)(
      'forwards comparisonEnabled and offset to the %s tab route',
      (serviceOverviewTab) => {
        const path = getPathForServiceDetail(
          {
            serviceName: 'svc',
            serviceOverviewTab,
            query: {
              environment: 'prod' as Environment,
              comparisonEnabled: true,
              offset: 'expected_bounds',
            },
          },
          defaultOptions
        );
        const { query } = splitPath(path);

        expect(query.get('comparisonEnabled')).toBe('true');
        expect(query.get('offset')).toBe('expected_bounds');
      }
    );

    it.each(['alerts', 'logs', 'metrics', 'traces', 'transactions', 'errors'] as const)(
      'does not forward anomalyThreshold to the %s tab route',
      (serviceOverviewTab) => {
        const path = getPathForServiceDetail(
          {
            serviceName: 'svc',
            serviceOverviewTab,
            query: {
              environment: 'prod' as Environment,
              anomalyThreshold: ML_ANOMALY_SEVERITY.CRITICAL,
            },
          },
          defaultOptions
        );

        expect(splitPath(path).query.get('anomalyThreshold')).not.toBe('critical');
      }
    );
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
