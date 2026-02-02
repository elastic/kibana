/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServiceHealthStatus } from '../../../../common/service_health_status';
import type { getServiceTransactionStats } from './get_service_transaction_stats';
import { mergeServiceStats } from './merge_service_stats';

type ServiceTransactionStat = Awaited<
  ReturnType<typeof getServiceTransactionStats>
>['serviceStats'][number];

function stat(values: Partial<ServiceTransactionStat>): ServiceTransactionStat {
  return {
    serviceName: 'opbeans-java',
    environments: ['production'],
    latency: 1,
    throughput: 2,
    transactionErrorRate: 3,
    transactionType: 'request',
    agentName: 'java',
    ...values,
  };
}

describe('mergeServiceStats', () => {
  it('joins stats by service name', () => {
    expect(
      mergeServiceStats({
        serviceStats: [
          stat({
            serviceName: 'opbeans-java',
            environments: ['production'],
          }),
          stat({
            serviceName: 'opbeans-java-2',
            environments: ['staging'],
            throughput: 4,
          }),
        ],
        healthStatuses: [
          {
            healthStatus: ServiceHealthStatus.healthy,
            serviceName: 'opbeans-java',
          },
        ],
        alertCounts: [
          {
            alertsCount: 1,
            serviceName: 'opbeans-java',
          },
        ],
        sloStats: [
          {
            serviceName: 'opbeans-java',
            sloStatus: 'violated',
            sloCount: 1,
          },
        ],
      })
    ).toEqual([
      {
        agentName: 'java',
        environments: ['staging'],
        serviceName: 'opbeans-java-2',
        latency: 1,
        throughput: 4,
        transactionErrorRate: 3,
        transactionType: 'request',
      },
      {
        agentName: 'java',
        environments: ['production'],
        healthStatus: ServiceHealthStatus.healthy,
        serviceName: 'opbeans-java',
        latency: 1,
        throughput: 2,
        transactionErrorRate: 3,
        transactionType: 'request',
        alertsCount: 1,
        sloStatus: 'violated',
        sloCount: 1,
      },
    ]);
  });

  it('excludes alerts from services not found in APM data', () => {
    // Services with only alert data (no APM service stats) should NOT appear
    // This prevents phantom services (e.g., wildcard "*" from SLO alerts) from showing
    expect(
      mergeServiceStats({
        serviceStats: [
          stat({
            serviceName: 'opbeans-java-2',
            environments: ['staging'],
          }),
        ],
        healthStatuses: [
          {
            healthStatus: ServiceHealthStatus.healthy,
            serviceName: 'opbeans-java', // Not in serviceStats - will be excluded
          },
        ],
        alertCounts: [
          {
            alertsCount: 2,
            serviceName: 'opbeans-java', // Not in serviceStats - will be excluded
          },
        ],
        sloStats: [
          {
            serviceName: 'opbeans-java-2',
            sloStatus: 'degrading',
            sloCount: 1,
          },
          {
            serviceName: 'unknown-service',
            sloStatus: 'violated',
            sloCount: 5,
          },
        ],
      })
    ).toEqual([
      {
        agentName: 'java',
        environments: ['staging'],
        serviceName: 'opbeans-java-2',
        latency: 1,
        throughput: 2,
        transactionErrorRate: 3,
        transactionType: 'request',
        sloStatus: 'degrading',
        sloCount: 1,
      },
    ]);
  });

  it('does not show services that only have ML data', () => {
    expect(
      mergeServiceStats({
        serviceStats: [
          stat({
            serviceName: 'opbeans-java-2',
            environments: ['staging'],
          }),
        ],
        healthStatuses: [
          {
            healthStatus: ServiceHealthStatus.healthy,
            serviceName: 'opbeans-java',
          },
        ],
        alertCounts: [
          {
            alertsCount: 3,
            serviceName: 'opbeans-java-2',
          },
        ],
        sloStats: [
          {
            serviceName: 'opbeans-java-2',
            sloStatus: 'violated',
            sloCount: 2,
          },
        ],
      })
    ).toEqual([
      {
        agentName: 'java',
        environments: ['staging'],
        serviceName: 'opbeans-java-2',
        latency: 1,
        throughput: 2,
        transactionErrorRate: 3,
        transactionType: 'request',
        alertsCount: 3,
        sloStatus: 'violated',
        sloCount: 2,
      },
    ]);
  });
});
