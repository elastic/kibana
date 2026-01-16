/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import type { SloStatus } from '../../../../../common/service_inventory';
import { orderServiceItems } from './order_service_items';

describe('orderServiceItems', () => {
  describe('multi-level sorting: alerts -> SLO status -> health status -> throughput', () => {
    it('sorts by alerts count first (desc)', () => {
      const sortedItems = orderServiceItems({
        sortDirection: 'desc',
        items: [
          { serviceName: 'no-alerts', alertsCount: 0 },
          { serviceName: 'many-alerts', alertsCount: 5 },
          { serviceName: 'one-alert', alertsCount: 1 },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'many-alerts',
        'one-alert',
        'no-alerts',
      ]);
    });

    it('sorts by SLO status when alerts are equal', () => {
      const sortedItems = orderServiceItems({
        sortDirection: 'desc',
        items: [
          { serviceName: 'healthy-slo', alertsCount: 1, sloStatus: 'healthy' as SloStatus },
          { serviceName: 'violated-slo', alertsCount: 1, sloStatus: 'violated' as SloStatus },
          { serviceName: 'degrading-slo', alertsCount: 1, sloStatus: 'degrading' as SloStatus },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'violated-slo',
        'degrading-slo',
        'healthy-slo',
      ]);
    });

    it('sorts by SLO count within same status', () => {
      const sortedItems = orderServiceItems({
        sortDirection: 'desc',
        items: [
          {
            serviceName: '2-violated',
            alertsCount: 1,
            sloStatus: 'violated' as SloStatus,
            sloCount: 2,
          },
          {
            serviceName: '5-violated',
            alertsCount: 1,
            sloStatus: 'violated' as SloStatus,
            sloCount: 5,
          },
          {
            serviceName: '10-degrading',
            alertsCount: 1,
            sloStatus: 'degrading' as SloStatus,
            sloCount: 10,
          },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        '5-violated',
        '2-violated',
        '10-degrading',
      ]);
    });

    it('sorts by health status when alerts and SLO are equal', () => {
      const sortedItems = orderServiceItems({
        sortDirection: 'desc',
        items: [
          { serviceName: 'unknown', healthStatus: ServiceHealthStatus.unknown },
          { serviceName: 'critical', healthStatus: ServiceHealthStatus.critical },
          { serviceName: 'healthy', healthStatus: ServiceHealthStatus.healthy },
          { serviceName: 'warning', healthStatus: ServiceHealthStatus.warning },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'critical',
        'warning',
        'healthy',
        'unknown',
      ]);
    });

    it('sorts by throughput as final tiebreaker', () => {
      const sortedItems = orderServiceItems({
        sortDirection: 'desc',
        items: [
          { serviceName: 'low-throughput', throughput: 10 },
          { serviceName: 'high-throughput', throughput: 100 },
          { serviceName: 'med-throughput', throughput: 50 },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'high-throughput',
        'med-throughput',
        'low-throughput',
      ]);
    });

    it('applies full multi-level sort correctly', () => {
      const sortedItems = orderServiceItems({
        sortDirection: 'desc',
        items: [
          // No alerts, no SLO, high throughput
          { serviceName: 'service-f', alertsCount: 0, throughput: 1000 },
          // 1 alert, healthy SLO
          {
            serviceName: 'service-d',
            alertsCount: 1,
            sloStatus: 'healthy' as SloStatus,
            sloCount: 1,
          },
          // 1 alert, 2 violated SLOs
          {
            serviceName: 'service-b',
            alertsCount: 1,
            sloStatus: 'violated' as SloStatus,
            sloCount: 2,
          },
          // 3 alerts, 2 violated SLOs
          {
            serviceName: 'service-a',
            alertsCount: 3,
            sloStatus: 'violated' as SloStatus,
            sloCount: 2,
          },
          // 1 alert, 1 violated SLO
          {
            serviceName: 'service-c',
            alertsCount: 1,
            sloStatus: 'violated' as SloStatus,
            sloCount: 1,
          },
          // No alerts, no SLO, low throughput
          { serviceName: 'service-e', alertsCount: 0, throughput: 100 },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'service-a', // 3 alerts (highest)
        'service-b', // 1 alert, 2 violated
        'service-c', // 1 alert, 1 violated
        'service-d', // 1 alert, healthy SLO
        'service-f', // 0 alerts, high throughput
        'service-e', // 0 alerts, low throughput
      ]);
    });

    it('handles ascending sort direction', () => {
      const sortedItems = orderServiceItems({
        sortDirection: 'asc',
        items: [
          { serviceName: 'many-alerts', alertsCount: 5 },
          { serviceName: 'no-alerts', alertsCount: 0 },
          { serviceName: 'one-alert', alertsCount: 1 },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'no-alerts',
        'one-alert',
        'many-alerts',
      ]);
    });

    it('handles missing values gracefully', () => {
      const sortedItems = orderServiceItems({
        sortDirection: 'desc',
        items: [
          { serviceName: 'with-alerts', alertsCount: 1 },
          { serviceName: 'no-data' }, // No alertsCount, no sloStatus, no healthStatus, no throughput
          { serviceName: 'with-slo', sloStatus: 'violated' as SloStatus, sloCount: 1 },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'with-alerts',
        'with-slo',
        'no-data',
      ]);
    });
  });
});
