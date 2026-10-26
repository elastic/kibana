/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTransactionGroupsWithAlerts } from './merge_transaction_groups_with_alerts';
import type { ServiceTransactionGroupsResponse } from '../services/get_service_transaction_groups';

function txGroup(
  overrides: Partial<ServiceTransactionGroupsResponse['transactionGroups'][number]> & {
    name: string;
  }
): ServiceTransactionGroupsResponse['transactionGroups'][number] {
  return {
    alertsCount: 0,
    transactionType: 'request',
    latency: 10,
    throughput: 1,
    errorRate: 0,
    impact: 1,
    ...overrides,
  };
}

describe('mergeTransactionGroupsWithAlerts', () => {
  it('decorates matching rows and does not reintroduce kuery-excluded alert groups', () => {
    const result = mergeTransactionGroupsWithAlerts({
      transactionGroups: [txGroup({ name: 'GET /a' })],
      alerts: [
        { name: 'GET /a', alertsCount: 2 },
        { name: 'GET /b', alertsCount: 5 },
      ],
    });

    expect(result.transactionGroups).toEqual([
      expect.objectContaining({
        name: 'GET /a',
        alertsCount: 2,
        transactionType: 'request',
        latency: 10,
      }),
    ]);
    expect(result.transactionGroups.find(({ name }) => name === 'GET /b')).toBeUndefined();
    expect(result.hasActiveAlerts).toBe(true);
  });

  it('sets hasActiveAlerts false when no alerts match the filtered stats rows', () => {
    const result = mergeTransactionGroupsWithAlerts({
      transactionGroups: [txGroup({ name: 'GET /a' })],
      alerts: [{ name: 'GET /b', alertsCount: 3 }],
    });

    expect(result.transactionGroups).toEqual([
      expect.objectContaining({ name: 'GET /a', alertsCount: 0 }),
    ]);
    expect(result.hasActiveAlerts).toBe(false);
  });
});
