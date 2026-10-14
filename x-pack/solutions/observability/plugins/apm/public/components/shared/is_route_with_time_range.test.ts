/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Location } from 'history';
import { apmRouter } from '../routing/apm_route_config';
import { isRouteWithComparison, isRouteWithTimeRange } from './is_route_with_time_range';

const createLocation = (pathname: string): Location =>
  ({ pathname, search: '', hash: '', state: undefined, key: '' } as Location);

describe('isRouteWithTimeRange', () => {
  it.each([
    '/services',
    '/traces',
    '/service-map',
    '/dependencies',
    '/dependencies/inventory',
    '/storage-explorer',
    '/service-groups',
    '/diagnostics',
    '/services/opbeans-java',
    '/mobile-services/opbeans-android',
  ])('returns true for the time-range route %s', (pathname) => {
    expect(isRouteWithTimeRange({ apmRouter, location: createLocation(pathname) })).toBe(true);
  });

  // Legacy `/backends*` routes redirect to `/dependencies*` but still require a
  // time range because they render under the home route. Because the check is
  // derived from the route params codec, they are covered automatically. See #1318.
  it.each([
    '/backends',
    '/backends/inventory',
    '/backends/operations',
    '/backends/operation',
    '/backends/overview',
    '/backends/some-dependency/overview',
  ])('returns true for the legacy backends route %s', (pathname) => {
    expect(isRouteWithTimeRange({ apmRouter, location: createLocation(pathname) })).toBe(true);
  });

  it('returns true for the root pathname', () => {
    expect(isRouteWithTimeRange({ apmRouter, location: createLocation('/') })).toBe(true);
  });

  it('returns false for a settings route that does not require a time range', () => {
    expect(
      isRouteWithTimeRange({ apmRouter, location: createLocation('/settings/agent-configuration') })
    ).toBe(false);
  });
});

describe('isRouteWithComparison', () => {
  it.each([
    '/services',
    '/service-map',
    '/dependencies',
    '/dependencies/inventory',
    '/services/opbeans-java',
    '/mobile-services/opbeans-android',
    '/service-groups',
    '/backends/inventory',
  ])('returns true for the comparison-aware route %s', (pathname) => {
    expect(isRouteWithComparison({ apmRouter, location: createLocation(pathname) })).toBe(true);
  });

  it('returns false for a route that does not require comparisonEnabled', () => {
    expect(
      isRouteWithComparison({
        apmRouter,
        location: createLocation('/settings/agent-configuration'),
      })
    ).toBe(false);
  });

  it('returns false for diagnostics which does not declare comparisonEnabled', () => {
    expect(isRouteWithComparison({ apmRouter, location: createLocation('/diagnostics') })).toBe(
      false
    );
  });
});
