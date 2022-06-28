/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import { ServiceInventoryFieldName } from '../../../../../common/service_inventory';
import { orderServiceItems } from './order_service_items';

describe('orderServiceItems', () => {
  describe('when sorting by health status', () => {
    describe('desc', () => {
      it('orders from critical to unknown', () => {
        const sortedItems = orderServiceItems({
          primarySortField: ServiceInventoryFieldName.HealthStatus,
          sortDirection: 'desc',
          tiebreakerField: ServiceInventoryFieldName.Throughput,
          items: [
            {
              serviceName: 'critical-service',
              healthStatus: ServiceHealthStatus.critical,
            },
            {
              serviceName: 'healthy-service',
              healthStatus: ServiceHealthStatus.healthy,
            },
            {
              serviceName: 'warning-service',
              healthStatus: ServiceHealthStatus.warning,
            },
            {
              serviceName: 'unknown-service',
              healthStatus: ServiceHealthStatus.unknown,
            },
          ],
        });

        expect(sortedItems.map((item) => item.serviceName)).toEqual([
          'critical-service',
          'warning-service',
          'healthy-service',
          'unknown-service',
        ]);
      });

      it('sorts by service name ascending as a tie-breaker', () => {
        const sortedItems = orderServiceItems({
          primarySortField: ServiceInventoryFieldName.HealthStatus,
          sortDirection: 'desc',
          tiebreakerField: ServiceInventoryFieldName.ServiceName,
          items: [
            {
              serviceName: 'b-critical-service',
              healthStatus: ServiceHealthStatus.critical,
            },
            {
              serviceName: 'a-critical-service',
              healthStatus: ServiceHealthStatus.critical,
            },
            {
              serviceName: 'a-unknown-service',
              healthStatus: ServiceHealthStatus.unknown,
            },
            {
              serviceName: 'b-unknown-service',
              healthStatus: ServiceHealthStatus.unknown,
            },
          ],
        });

        expect(sortedItems.map((item) => item.serviceName)).toEqual([
          'a-critical-service',
          'b-critical-service',
          'a-unknown-service',
          'b-unknown-service',
        ]);
      });

      it('sorts by metric descending as a tie-breaker', () => {
        const sortedItems = orderServiceItems({
          primarySortField: ServiceInventoryFieldName.HealthStatus,
          sortDirection: 'desc',
          tiebreakerField: ServiceInventoryFieldName.Throughput,
          items: [
            {
              serviceName: 'low-throughput-service',
              healthStatus: ServiceHealthStatus.unknown,
              throughput: 1,
            },
            {
              serviceName: 'high-throughput-service',
              healthStatus: ServiceHealthStatus.unknown,
              throughput: 100,
            },
            {
              serviceName: 'med-throughput-service',
              healthStatus: ServiceHealthStatus.unknown,
              throughput: 10,
            },
            {
              serviceName: 'critical-service',
              healthStatus: ServiceHealthStatus.critical,
              throughput: 0,
            },
          ],
        });

        expect(sortedItems.map((item) => item.serviceName)).toEqual([
          'critical-service',
          'high-throughput-service',
          'med-throughput-service',
          'low-throughput-service',
        ]);
      });
    });

    describe('asc', () => {
      it('orders from unknown to critical', () => {
        const sortedItems = orderServiceItems({
          primarySortField: ServiceInventoryFieldName.HealthStatus,
          sortDirection: 'asc',
          tiebreakerField: ServiceInventoryFieldName.Throughput,
          items: [
            {
              serviceName: 'critical-service',
              healthStatus: ServiceHealthStatus.critical,
            },
            {
              serviceName: 'healthy-service',
              healthStatus: ServiceHealthStatus.healthy,
            },
            {
              serviceName: 'warning-service',
              healthStatus: ServiceHealthStatus.warning,
            },
            {
              serviceName: 'unknown-service',
              healthStatus: ServiceHealthStatus.unknown,
            },
          ],
        });

        expect(sortedItems.map((item) => item.serviceName)).toEqual([
          'unknown-service',
          'healthy-service',
          'warning-service',
          'critical-service',
        ]);
      });
    });
  });

  describe('when sorting by metric fields', () => {
    it('sorts correctly', () => {
      const sortedItems = orderServiceItems({
        primarySortField: ServiceInventoryFieldName.Throughput,
        sortDirection: 'desc',
        tiebreakerField: ServiceInventoryFieldName.Throughput,
        items: [
          {
            serviceName: 'low-throughput-service',
            healthStatus: ServiceHealthStatus.unknown,
            throughput: 1,
          },
          {
            serviceName: 'high-throughput-service',
            healthStatus: ServiceHealthStatus.unknown,
            throughput: 100,
          },
          {
            serviceName: 'med-throughput-service',
            healthStatus: ServiceHealthStatus.unknown,
            throughput: 10,
          },
          {
            serviceName: 'critical-service',
            healthStatus: ServiceHealthStatus.critical,
            throughput: 0,
          },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'high-throughput-service',
        'med-throughput-service',
        'low-throughput-service',
        'critical-service',
      ]);
    });
  });

  describe('when sorting by alphabetical fields', () => {
    const sortedItems = orderServiceItems({
      primarySortField: ServiceInventoryFieldName.ServiceName,
      sortDirection: 'asc',
      tiebreakerField: ServiceInventoryFieldName.ServiceName,
      items: [
        {
          serviceName: 'd-service',
          healthStatus: ServiceHealthStatus.unknown,
        },
        {
          serviceName: 'a-service',
          healthStatus: ServiceHealthStatus.unknown,
        },
        {
          serviceName: 'b-service',
          healthStatus: ServiceHealthStatus.unknown,
        },
        {
          serviceName: 'c-service',
          healthStatus: ServiceHealthStatus.unknown,
        },
        {
          serviceName: '0-service',
          healthStatus: ServiceHealthStatus.unknown,
        },
      ],
    });

    expect(sortedItems.map((item) => item.serviceName)).toEqual([
      '0-service',
      'a-service',
      'b-service',
      'c-service',
      'd-service',
    ]);
  });
});
