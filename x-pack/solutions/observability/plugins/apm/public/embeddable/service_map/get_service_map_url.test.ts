/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as encodeRison } from '@kbn/rison';
import { decode as decodeRison } from '@kbn/rison';
import { SERVICE_NAME } from '@kbn/apm-types';
import { coreMock } from '@kbn/core/public/mocks';
import { getServiceMapUrl } from './get_service_map_url';

function getLastPath(core: ReturnType<typeof coreMock.createStart>): string {
  const lastCall = core.application.getUrlForApp.mock.calls.at(-1);
  expect(lastCall).toBeDefined();
  return (lastCall![1] as { path: string }).path;
}

function getAppStateFromPath(path: string): Record<string, unknown> | null {
  const query = new URLSearchParams(path.slice('#/service-map?'.length));
  const encoded = query.get('_a');
  if (!encoded) return null;
  return decodeRison(encoded) as Record<string, unknown>;
}

describe('getServiceMapUrl', () => {
  const core = coreMock.createStart();
  core.application.getUrlForApp.mockImplementation((appId: string, options?: { path?: string }) => {
    const path = options?.path ?? '';
    return `/basepath/app/${appId}${path}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns global service map URL with query params', () => {
    const url = getServiceMapUrl(core, {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      environment: 'production',
      kuery: 'service.name: my-service',
    });
    expect(core.application.getUrlForApp).toHaveBeenCalledWith('apm', {
      path: '#/service-map?rangeFrom=now-15m&rangeTo=now&environment=production&kuery=service.name%3A+my-service',
    });
    expect(url).toBe(
      '/basepath/app/apm#/service-map?rangeFrom=now-15m&rangeTo=now&environment=production&kuery=service.name%3A+my-service'
    );
  });

  it('seeds service.name into controlSelections when serviceName is provided', () => {
    getServiceMapUrl(core, {
      rangeFrom: 'now-1h',
      rangeTo: 'now',
      serviceName: 'my-service',
    });

    const path = getLastPath(core);
    expect(path.startsWith('#/service-map?')).toBe(true);
    const query = new URLSearchParams(path.slice('#/service-map?'.length));
    expect(query.get('rangeFrom')).toBe('now-1h');
    expect(query.get('rangeTo')).toBe('now');
    expect(getAppStateFromPath(path)).toEqual({
      controlSelections: { [SERVICE_NAME]: ['my-service'] },
    });
  });

  it('keeps non-control filterPills as filters and promotes service.name to controls', () => {
    getServiceMapUrl(core, {
      rangeFrom: 'now-1h',
      rangeTo: 'now',
      serviceName: 'my-service',
      filterPills: [
        { field: SERVICE_NAME, value: 'my-service' },
        { field: 'transaction.type', value: 'request' },
        { field: 'transaction.name', value: 'GET /api' },
      ],
    });

    const path = getLastPath(core);
    expect(getAppStateFromPath(path)).toEqual({
      controlSelections: { [SERVICE_NAME]: ['my-service'] },
      filters: [
        {
          meta: { key: 'transaction.type', negate: false, disabled: false },
          query: { match_phrase: { 'transaction.type': 'request' } },
        },
        {
          meta: { key: 'transaction.name', negate: false, disabled: false },
          query: { match_phrase: { 'transaction.name': 'GET /api' } },
        },
      ],
    });
  });

  it('merges explicit controlSelections with serviceName', () => {
    getServiceMapUrl(core, {
      rangeFrom: 'now-1h',
      rangeTo: 'now',
      serviceName: 'frontend',
      controlSelections: {
        [SERVICE_NAME]: ['checkout'],
        'cloud.region': ['us-east-1'],
      },
    });

    expect(getAppStateFromPath(getLastPath(core))).toEqual({
      controlSelections: {
        [SERVICE_NAME]: ['checkout', 'frontend'],
        'cloud.region': ['us-east-1'],
      },
    });
  });

  it('includes serviceGroupId in query when provided', () => {
    getServiceMapUrl(core, {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      serviceGroupId: 'group-1',
    });
    expect(core.application.getUrlForApp).toHaveBeenCalledWith('apm', {
      path: '#/service-map?rangeFrom=now-15m&rangeTo=now&serviceGroup=group-1',
    });
  });

  it('encodes controlSelections with rison compatible with URL restore', () => {
    const expectedAppState = encodeRison({
      controlSelections: { [SERVICE_NAME]: ['frontend'] },
    });

    getServiceMapUrl(core, {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      serviceName: 'frontend',
    });

    const query = new URLSearchParams(getLastPath(core).slice('#/service-map?'.length));
    expect(query.get('_a')).toBe(expectedAppState);
  });
});
