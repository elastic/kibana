/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { getServiceMapPath, getServiceMapUrl } from './get_service_map_url';

describe('getServiceMapUrl', () => {
  const core = coreMock.createStart();
  core.application.getUrlForApp.mockImplementation((appId: string, options?: { path?: string }) => {
    const path = options?.path ?? '';
    return `/basepath/app/${appId}${path}`;
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

  it('always uses full service map path (serviceName is not used in path)', () => {
    getServiceMapUrl(core, {
      rangeFrom: 'now-1h',
      rangeTo: 'now',
      serviceName: 'my-service',
    });
    expect(core.application.getUrlForApp).toHaveBeenCalledWith('apm', {
      path: '#/service-map?rangeFrom=now-1h&rangeTo=now',
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
});

describe('getServiceMapPath', () => {
  it('returns path with rangeFrom and rangeTo', () => {
    expect(getServiceMapPath({ rangeFrom: 'now-1h', rangeTo: 'now' })).toBe(
      '#/service-map?rangeFrom=now-1h&rangeTo=now'
    );
  });

  it('returns path with only hash when no params', () => {
    expect(getServiceMapPath({ rangeFrom: '', rangeTo: '' })).toBe(
      '#/service-map?rangeFrom=&rangeTo='
    );
  });

  it('includes environment and kuery when provided', () => {
    const path = getServiceMapPath({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      environment: 'oteldemo',
      kuery: 'service.name: "product-reviews"',
    });
    expect(path).toContain('environment=oteldemo');
    expect(path).toContain('kuery=');
    expect(path).toContain('service.name');
    expect(path).toContain('product-reviews');
  });

  it('encodes kuery with service name in query string', () => {
    const path = getServiceMapPath({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      kuery: 'service.name: "product-reviews"',
    });
    expect(path).toContain('#/service-map');
    expect(path).toContain('rangeFrom=now-15m');
    expect(path).toContain('rangeTo=now');
    expect(path).toContain('kuery=');
    const kueryParam = path.split('kuery=')[1]?.split('&')[0] ?? '';
    const decoded = decodeURIComponent(kueryParam.replace(/\+/g, ' '));
    expect(decoded).toBe('service.name: "product-reviews"');
  });
});
