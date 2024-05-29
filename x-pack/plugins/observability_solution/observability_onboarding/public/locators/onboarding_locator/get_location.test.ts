/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLocation } from './get_location';
import { PLUGIN_ID } from '../../../common';
import { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';

describe('getLocation', () => {
  it('should return the correct location with source and query', () => {
    const params: ObservabilityOnboardingLocatorParams = {
      source: 'customLogs',
      category: 'infra',
    };

    const result = getLocation(params);

    expect(result).toEqual({
      app: PLUGIN_ID,
      path: '/customLogs?category=infra',
      state: {},
    });
  });

  it('should return the correct location with only source', () => {
    const params: ObservabilityOnboardingLocatorParams = {
      source: 'systemLogs',
    };

    const result = getLocation(params);

    expect(result).toEqual({
      app: PLUGIN_ID,
      path: '/systemLogs',
      state: {},
    });
  });

  it('should return the correct location with only query', () => {
    const params: ObservabilityOnboardingLocatorParams = {
      source: undefined,
      category: 'metrics',
    };

    const result = getLocation(params);

    expect(result).toEqual({
      app: PLUGIN_ID,
      path: '/?category=metrics',
      state: {},
    });
  });

  it('should return the correct location with neither source nor query', () => {
    const params: ObservabilityOnboardingLocatorParams = {
      source: undefined,
      query: undefined,
    };

    const result = getLocation(params);

    expect(result).toEqual({
      app: PLUGIN_ID,
      path: '/',
      state: {},
    });
  });
});
