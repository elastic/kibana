/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServiceHealthStatus } from '../../../../common/service_health_status';
import { getServiceTransactionStats } from './get_service_transaction_stats';
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
        servicesWithoutTransactions: [
          {
            environments: ['production'],
            serviceName: 'opbeans-java',
            agentName: 'java',
          },
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
      },
    ]);
  });

  it('shows services that only have metric documents', () => {
    expect(
      mergeServiceStats({
        serviceStats: [
          stat({
            serviceName: 'opbeans-java-2',
            environments: ['staging'],
          }),
        ],
        servicesWithoutTransactions: [
          {
            environments: ['production'],
            serviceName: 'opbeans-java',
            agentName: 'java',
          },
        ],
        healthStatuses: [
          {
            healthStatus: ServiceHealthStatus.healthy,
            serviceName: 'opbeans-java',
          },
        ],
        alertCounts: [
          {
            alertsCount: 2,
            serviceName: 'opbeans-java',
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
      },
      {
        agentName: 'java',
        environments: ['production'],
        healthStatus: ServiceHealthStatus.healthy,
        serviceName: 'opbeans-java',
        alertsCount: 2,
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
        servicesWithoutTransactions: [],
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
      },
    ]);
  });

  it('concatenates environments from metric/transaction data', () => {
    expect(
      mergeServiceStats({
        serviceStats: [
          stat({
            serviceName: 'opbeans-java',
            environments: ['staging'],
          }),
        ],
        servicesWithoutTransactions: [
          {
            environments: ['production'],
            serviceName: 'opbeans-java',
            agentName: 'java',
          },
        ],
        healthStatuses: [],
        alertCounts: [],
      })
    ).toEqual([
      {
        agentName: 'java',
        environments: ['staging', 'production'],
        serviceName: 'opbeans-java',
        latency: 1,
        throughput: 2,
        transactionErrorRate: 3,
        transactionType: 'request',
      },
    ]);
  });
});
