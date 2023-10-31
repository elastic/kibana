/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Integration } from '../hooks/use_integrations';
import {
  filterIntegrations,
  THREAT_INTELLIGENCE_CATEGORY,
  THREAT_INTELLIGENCE_UTILITIES,
} from './filter_integrations';

describe('filterIntegrations', () => {
  it('should empty array', async () => {
    const mockIntegrations: Integration[] = [];
    const result = filterIntegrations(mockIntegrations);
    expect(result).toEqual(mockIntegrations);
  });

  it('should return only installed ti integrations (excluding ti_utils)', async () => {
    const tiInstalledIntegration: Integration = {
      categories: [THREAT_INTELLIGENCE_CATEGORY],
      id: '123',
      status: 'installed',
    };
    const tiNotInstalledIntegration: Integration = {
      categories: [THREAT_INTELLIGENCE_CATEGORY],
      id: '456',
      status: 'install_failed',
    };
    const nonTIInstalledIntegration: Integration = {
      categories: ['abc'],
      id: '789',
      status: 'installed',
    };
    const tiUtilsIntegration: Integration = {
      categories: [THREAT_INTELLIGENCE_CATEGORY],
      id: THREAT_INTELLIGENCE_UTILITIES,
      status: 'installed',
    };
    const randomIntegration: Integration = {
      categories: ['abc'],
      id: 'def',
      status: 'installing',
    };
    const mockIntegrations: Integration[] = [
      tiInstalledIntegration,
      tiNotInstalledIntegration,
      nonTIInstalledIntegration,
      tiUtilsIntegration,
      randomIntegration,
    ];

    const result = filterIntegrations(mockIntegrations);

    expect(result).toEqual([tiInstalledIntegration]);
  });
});
