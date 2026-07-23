/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceFlyoutContextValue } from '../service_flyout_context';

export function createMockServiceFlyoutContext(
  overrides: Partial<ServiceFlyoutContextValue> = {}
): ServiceFlyoutContextValue {
  return {
    deps: {
      core: {
        http: {},
        notifications: { toasts: { addDanger: jest.fn() } },
        application: {
          capabilities: { slo: { read: true }, apm: {} },
          navigateToUrl: jest.fn(),
        },
        uiSettings: { get: jest.fn() },
      } as any,
      share: { url: { locators: { get: jest.fn() } } } as any,
      lens: undefined as any,
      dataViews: undefined as any,
    },
    service: {
      name: 'opbeans-java',
      agentName: 'java',
    },
    filters: {
      environment: 'production' as const,
      setEnvironment: jest.fn(),
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      setRange: jest.fn(),
      refreshToken: 0,
      onRefresh: jest.fn(),
      transactionType: 'request',
      setTransactionType: jest.fn(),
    },
    ...overrides,
  };
}
