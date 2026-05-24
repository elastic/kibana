/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SloStatus } from '../../../../../common/service_inventory';
import { ServiceInventoryFieldName } from '../../../../../common/service_inventory';
import { getAvailableFields, orderServiceItems } from './order_service_items';

describe('orderServiceItems', () => {
  describe('default multi-level sorting (isDefaultSort=true)', () => {
    it('sorts by alerts count first (desc)', () => {
      const sortedItems = orderServiceItems({
        sortField: ServiceInventoryFieldName.AlertsCount,
        sortDirection: 'desc',
        isDefaultSort: true,
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
        sortField: ServiceInventoryFieldName.SloStatus,
        sortDirection: 'desc',
        isDefaultSort: true,
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
        sortField: ServiceInventoryFieldName.SloStatus,
        sortDirection: 'desc',
        isDefaultSort: true,
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

    it('applies full multi-level sort correctly', () => {
      const sortedItems = orderServiceItems({
        sortField: ServiceInventoryFieldName.AlertsCount,
        sortDirection: 'desc',
        isDefaultSort: true,
        items: [
          { serviceName: 'service-f', alertsCount: 0, throughput: 1000 },
          {
            serviceName: 'service-d',
            alertsCount: 1,
            sloStatus: 'healthy' as SloStatus,
            sloCount: 1,
          },
          {
            serviceName: 'service-b',
            alertsCount: 1,
            sloStatus: 'violated' as SloStatus,
            sloCount: 2,
          },
          {
            serviceName: 'service-a',
            alertsCount: 3,
            sloStatus: 'violated' as SloStatus,
            sloCount: 2,
          },
          {
            serviceName: 'service-c',
            alertsCount: 1,
            sloStatus: 'violated' as SloStatus,
            sloCount: 1,
          },
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
  });

  describe('single column sorting (isDefaultSort=false)', () => {
    it('sorts only by alerts count when user clicks alerts column', () => {
      const sortedItems = orderServiceItems({
        sortField: ServiceInventoryFieldName.AlertsCount,
        sortDirection: 'desc',
        isDefaultSort: false,
        items: [
          { serviceName: 'no-alerts', alertsCount: 0, throughput: 1000 },
          { serviceName: 'many-alerts', alertsCount: 5, throughput: 10 },
          { serviceName: 'one-alert', alertsCount: 1, throughput: 500 },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'many-alerts',
        'one-alert',
        'no-alerts',
      ]);
    });

    it('sorts only by SLO status when user clicks SLO column', () => {
      const sortedItems = orderServiceItems({
        sortField: ServiceInventoryFieldName.SloStatus,
        sortDirection: 'desc',
        isDefaultSort: false,
        items: [
          {
            serviceName: 'healthy-slo',
            alertsCount: 10,
            sloStatus: 'healthy' as SloStatus,
            sloCount: 1,
          },
          {
            serviceName: 'violated-slo',
            alertsCount: 0,
            sloStatus: 'violated' as SloStatus,
            sloCount: 1,
          },
          {
            serviceName: 'degrading-slo',
            alertsCount: 5,
            sloStatus: 'degrading' as SloStatus,
            sloCount: 1,
          },
        ],
      });

      // Should sort by SLO status only, ignoring alerts count
      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'violated-slo',
        'degrading-slo',
        'healthy-slo',
      ]);
    });

    it('sorts only by throughput when user clicks throughput column', () => {
      const sortedItems = orderServiceItems({
        sortField: ServiceInventoryFieldName.Throughput,
        sortDirection: 'desc',
        isDefaultSort: false,
        items: [
          { serviceName: 'low-throughput', alertsCount: 10, throughput: 10 },
          { serviceName: 'high-throughput', alertsCount: 0, throughput: 100 },
          { serviceName: 'med-throughput', alertsCount: 5, throughput: 50 },
        ],
      });

      // Should sort by throughput only, ignoring alerts count
      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'high-throughput',
        'med-throughput',
        'low-throughput',
      ]);
    });

    it('sorts only by anomaly score when user clicks anomalies column', () => {
      const sortedItems = orderServiceItems({
        sortField: ServiceInventoryFieldName.AnomalyScore,
        sortDirection: 'desc',
        isDefaultSort: false,
        items: [
          { serviceName: 'low-score', anomalyScore: 10, alertsCount: 10 },
          { serviceName: 'high-score', anomalyScore: 90, alertsCount: 0 },
          { serviceName: 'mid-score', anomalyScore: 50, alertsCount: 5 },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'high-score',
        'mid-score',
        'low-score',
      ]);
    });

    it('sorts by service name ascending', () => {
      const sortedItems = orderServiceItems({
        sortField: ServiceInventoryFieldName.ServiceName,
        sortDirection: 'asc',
        isDefaultSort: false,
        items: [
          { serviceName: 'zebra-service' },
          { serviceName: 'alpha-service' },
          { serviceName: 'beta-service' },
        ],
      });

      expect(sortedItems.map((item) => item.serviceName)).toEqual([
        'alpha-service',
        'beta-service',
        'zebra-service',
      ]);
    });
  });
});

describe('getAvailableFields', () => {
  it('returns AlertsCount sortField and correct flags when any service has alerts', () => {
    const result = getAvailableFields([
      { serviceName: 'service-a', alertsCount: 0 },
      { serviceName: 'service-b', alertsCount: 5 },
      { serviceName: 'service-c', sloStatus: 'violated' as SloStatus },
    ]);

    expect(result).toEqual({
      sortField: ServiceInventoryFieldName.AlertsCount,
      hasAlerts: true,
      hasSlos: true,
      hasAnomalyScores: false,
    });
  });

  it('returns SloStatus sortField when no alerts but services have SLO status', () => {
    const result = getAvailableFields([
      { serviceName: 'service-a', alertsCount: 0 },
      { serviceName: 'service-b', sloStatus: 'healthy' as SloStatus },
      { serviceName: 'service-c', anomalyScore: 75 },
    ]);

    expect(result).toEqual({
      sortField: ServiceInventoryFieldName.SloStatus,
      hasAlerts: false,
      hasSlos: true,
      hasAnomalyScores: true,
    });
  });

  it('returns AnomalyScore sortField when no alerts or SLOs but services have anomaly scores', () => {
    const result = getAvailableFields([
      { serviceName: 'service-a', alertsCount: 0 },
      { serviceName: 'service-b', anomalyScore: 42 },
      { serviceName: 'service-c', throughput: 100 },
    ]);

    expect(result).toEqual({
      sortField: ServiceInventoryFieldName.AnomalyScore,
      hasAlerts: false,
      hasSlos: false,
      hasAnomalyScores: true,
    });
  });

  it('returns Throughput sortField when no alerts, SLOs, or anomaly scores', () => {
    const result = getAvailableFields([
      { serviceName: 'service-a', throughput: 100 },
      { serviceName: 'service-b', latency: 50 },
    ]);

    expect(result).toEqual({
      sortField: ServiceInventoryFieldName.Throughput,
      hasAlerts: false,
      hasSlos: false,
      hasAnomalyScores: false,
    });
  });

  it('returns Throughput sortField for empty array', () => {
    const result = getAvailableFields([]);

    expect(result).toEqual({
      sortField: ServiceInventoryFieldName.Throughput,
      hasAlerts: false,
      hasSlos: false,
      hasAnomalyScores: false,
    });
  });

  it('ignores alertsCount of 0 when determining alerts presence', () => {
    const result = getAvailableFields([
      { serviceName: 'service-a', alertsCount: 0 },
      { serviceName: 'service-b', alertsCount: 0 },
      { serviceName: 'service-c', sloStatus: 'degrading' as SloStatus },
    ]);

    expect(result).toEqual({
      sortField: ServiceInventoryFieldName.SloStatus,
      hasAlerts: false,
      hasSlos: true,
      hasAnomalyScores: false,
    });
  });
});
