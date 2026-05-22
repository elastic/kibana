/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { getServiceMapUrl } from './get_service_map_url';

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

  it('returns service-specific service map URL when serviceName is provided', () => {
    getServiceMapUrl(core, {
      rangeFrom: 'now-1h',
      rangeTo: 'now',
      serviceName: 'my-service',
    });
    expect(core.application.getUrlForApp).toHaveBeenCalledWith('apm', {
      path: '#/services/my-service/service-map?rangeFrom=now-1h&rangeTo=now',
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
