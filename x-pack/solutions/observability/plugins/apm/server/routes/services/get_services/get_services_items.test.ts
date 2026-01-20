/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServicesItems } from './get_services_items';
import { getServiceTransactionStats } from './get_service_transaction_stats';
import { getHealthStatuses } from './get_health_statuses';
import { getServicesAlerts } from './get_service_alerts';
import { getServicesSlos } from './get_service_slos';
import { mergeServiceStats } from './merge_service_stats';
import { ServiceInventoryFieldName } from '../../../../common/service_inventory';
import { ServiceHealthStatus } from '../../../../common/service_health_status';
import type { Logger } from '@kbn/logging';

jest.mock('./get_service_transaction_stats');
jest.mock('./get_health_statuses');
jest.mock('./get_service_alerts');
jest.mock('./get_service_slos');
jest.mock('./merge_service_stats');

const mockGetServiceTransactionStats = getServiceTransactionStats as jest.Mock;
const mockGetHealthStatuses = getHealthStatuses as jest.Mock;
const mockGetServicesAlerts = getServicesAlerts as jest.Mock;
const mockGetServicesSlos = getServicesSlos as jest.Mock;
const mockMergeServiceStats = mergeServiceStats as jest.Mock;

describe('getServicesItems', () => {
  const mockLogger = {
    debug: jest.fn(),
  } as unknown as Logger;

  const baseParams = {
    environment: 'production',
    kuery: '',
    apmEventClient: {} as any,
    apmAlertsClient: {} as any,
    logger: mockLogger,
    start: 1000,
    end: 2000,
    serviceGroup: null,
    randomSampler: {} as any,
    documentType: 'transactionMetric' as any,
    rollupInterval: '1m' as any,
    useDurationSummary: false,
  };

  const mockServiceStats = {
    serviceStats: [
      { serviceName: 'service-a', throughput: 100 },
      { serviceName: 'service-b', throughput: 200 },
    ],
    serviceOverflowCount: 0,
    maxCountExceeded: false,
  };

  const mockHealthStatuses = [
    { serviceName: 'service-a', healthStatus: ServiceHealthStatus.healthy },
  ];

  const mockAlertCounts = [{ serviceName: 'service-a', alertsCount: 2 }];

  const mockSloCounts = [{ serviceName: 'service-a', sloStatus: 'healthy', sloCount: 1 }];

  const mockMergedItems = [
    { serviceName: 'service-a', throughput: 100, alertsCount: 2 },
    { serviceName: 'service-b', throughput: 200 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServiceTransactionStats.mockResolvedValue(mockServiceStats);
    mockGetHealthStatuses.mockResolvedValue(mockHealthStatuses);
    mockGetServicesAlerts.mockResolvedValue(mockAlertCounts);
    mockGetServicesSlos.mockResolvedValue(mockSloCounts);
    mockMergeServiceStats.mockReturnValue(mockMergedItems);
  });

  describe('conditional data fetching', () => {
    it('fetches all data when all include flags are true', async () => {
      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
        includeAlerts: true,
        includeHealthStatus: true,
        includeSloStatus: true,
      });

      expect(mockGetServiceTransactionStats).toHaveBeenCalled();
      expect(mockGetHealthStatuses).toHaveBeenCalled();
      expect(mockGetServicesAlerts).toHaveBeenCalled();
      expect(mockGetServicesSlos).toHaveBeenCalled();
      expect(result.items).toEqual(mockMergedItems);
    });

    it('skips health statuses when includeHealthStatus is false', async () => {
      await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
        includeAlerts: true,
        includeHealthStatus: false,
        includeSloStatus: true,
      });

      expect(mockGetServiceTransactionStats).toHaveBeenCalled();
      expect(mockGetHealthStatuses).not.toHaveBeenCalled();
      expect(mockGetServicesAlerts).toHaveBeenCalled();
      expect(mockGetServicesSlos).toHaveBeenCalled();

      expect(mockMergeServiceStats).toHaveBeenCalledWith(
        expect.objectContaining({
          healthStatuses: [],
        })
      );
    });

    it('skips alerts when includeAlerts is false', async () => {
      await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
        includeAlerts: false,
        includeHealthStatus: true,
        includeSloStatus: true,
      });

      expect(mockGetServiceTransactionStats).toHaveBeenCalled();
      expect(mockGetHealthStatuses).toHaveBeenCalled();
      expect(mockGetServicesAlerts).not.toHaveBeenCalled();
      expect(mockGetServicesSlos).toHaveBeenCalled();

      expect(mockMergeServiceStats).toHaveBeenCalledWith(
        expect.objectContaining({
          alertCounts: [],
        })
      );
    });

    it('skips SLOs when includeSloStatus is false', async () => {
      await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
        includeAlerts: true,
        includeHealthStatus: true,
        includeSloStatus: false,
      });

      expect(mockGetServiceTransactionStats).toHaveBeenCalled();
      expect(mockGetHealthStatuses).toHaveBeenCalled();
      expect(mockGetServicesAlerts).toHaveBeenCalled();
      expect(mockGetServicesSlos).not.toHaveBeenCalled();

      expect(mockMergeServiceStats).toHaveBeenCalledWith(
        expect.objectContaining({
          sloCounts: [],
        })
      );
    });

    it('skips SLOs when esClient is not provided', async () => {
      await getServicesItems({
        ...baseParams,
        esClient: undefined,
        spaceId: 'default',
        includeSloStatus: true,
      });

      expect(mockGetServicesSlos).not.toHaveBeenCalled();
    });

    it('skips SLOs when spaceId is not provided', async () => {
      await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: undefined,
        includeSloStatus: true,
      });

      expect(mockGetServicesSlos).not.toHaveBeenCalled();
    });

    it('skips SLOs when there are no services', async () => {
      mockGetServiceTransactionStats.mockResolvedValue({
        serviceStats: [],
        serviceOverflowCount: 0,
        maxCountExceeded: false,
      });

      await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
        includeSloStatus: true,
      });

      expect(mockGetServicesSlos).not.toHaveBeenCalled();
    });
  });

  describe('sort field priority', () => {
    it('returns AlertsCount as sortField when alerts exist', async () => {
      mockGetServicesAlerts.mockResolvedValue(mockAlertCounts);
      mockGetServicesSlos.mockResolvedValue(mockSloCounts);
      mockGetHealthStatuses.mockResolvedValue(mockHealthStatuses);

      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
      });

      expect(result.sortField).toBe(ServiceInventoryFieldName.AlertsCount);
    });

    it('returns SloStatus as sortField when no alerts but SLOs exist', async () => {
      mockGetServicesAlerts.mockResolvedValue([]);
      mockGetServicesSlos.mockResolvedValue(mockSloCounts);
      mockGetHealthStatuses.mockResolvedValue(mockHealthStatuses);

      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
      });

      expect(result.sortField).toBe(ServiceInventoryFieldName.SloStatus);
    });

    it('returns HealthStatus as sortField when no alerts or SLOs but health statuses exist', async () => {
      mockGetServicesAlerts.mockResolvedValue([]);
      mockGetServicesSlos.mockResolvedValue([]);
      mockGetHealthStatuses.mockResolvedValue(mockHealthStatuses);

      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
      });

      expect(result.sortField).toBe(ServiceInventoryFieldName.HealthStatus);
    });

    it('returns Throughput as sortField when no alerts, SLOs, or health statuses exist', async () => {
      mockGetServicesAlerts.mockResolvedValue([]);
      mockGetServicesSlos.mockResolvedValue([]);
      mockGetHealthStatuses.mockResolvedValue([]);

      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
      });

      expect(result.sortField).toBe(ServiceInventoryFieldName.Throughput);
    });
  });

  describe('error handling', () => {
    it('returns empty array and logs debug when getHealthStatuses fails', async () => {
      const error = new Error('Health status error');
      mockGetHealthStatuses.mockRejectedValue(error);

      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(error);
      expect(mockMergeServiceStats).toHaveBeenCalledWith(
        expect.objectContaining({
          healthStatuses: [],
        })
      );
      expect(result.items).toEqual(mockMergedItems);
    });

    it('returns empty array and logs debug when getServicesAlerts fails', async () => {
      const error = new Error('Alerts error');
      mockGetServicesAlerts.mockRejectedValue(error);

      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(error);
      expect(mockMergeServiceStats).toHaveBeenCalledWith(
        expect.objectContaining({
          alertCounts: [],
        })
      );
      expect(result.items).toEqual(mockMergedItems);
    });

    it('returns empty array and logs debug when getServicesSlos fails', async () => {
      const error = new Error('SLO error');
      mockGetServicesSlos.mockRejectedValue(error);

      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(error);
      expect(mockMergeServiceStats).toHaveBeenCalledWith(
        expect.objectContaining({
          sloCounts: [],
        })
      );
      expect(result.items).toEqual(mockMergedItems);
    });
  });

  describe('response structure', () => {
    it('returns correct response structure', async () => {
      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
      });

      expect(result).toEqual({
        items: mockMergedItems,
        maxCountExceeded: false,
        serviceOverflowCount: 0,
        sortField: ServiceInventoryFieldName.AlertsCount,
      });
    });

    it('passes maxCountExceeded from service stats', async () => {
      mockGetServiceTransactionStats.mockResolvedValue({
        ...mockServiceStats,
        maxCountExceeded: true,
      });

      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
      });

      expect(result.maxCountExceeded).toBe(true);
    });

    it('passes serviceOverflowCount from service stats', async () => {
      mockGetServiceTransactionStats.mockResolvedValue({
        ...mockServiceStats,
        serviceOverflowCount: 50,
      });

      const result = await getServicesItems({
        ...baseParams,
        esClient: {} as any,
        spaceId: 'default',
      });

      expect(result.serviceOverflowCount).toBe(50);
    });
  });
});
