/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getResponseActionFeatureKey } from './feature_keys';
import type { FeatureUsageService } from './service';
import type { PolicyData } from '../../../../common/endpoint/types';

export function createFeatureUsageServiceMock() {
  return {
    setup: jest.fn(),
    start: jest.fn(),
    notifyUsage: jest.fn(),
    getResponseActionFeatureKey: jest.fn(getResponseActionFeatureKey),
  } as unknown as jest.Mocked<FeatureUsageService>;
}

export function createMockPolicyData() {
  return {
    inputs: [
      {
        config: {
          policy: {
            value: {
              windows: {
                ransomware: { mode: 'off' },
                memory_protection: { mode: 'off' },
                behavior_protection: { mode: 'off' },
              },
              mac: {
                memory_protection: { mode: 'off' },
                behavior_protection: { mode: 'off' },
              },
              linux: {
                memory_protection: { mode: 'off' },
                behavior_protection: { mode: 'off' },
              },
            },
          },
        },
      },
    ],
  } as PolicyData;
}
