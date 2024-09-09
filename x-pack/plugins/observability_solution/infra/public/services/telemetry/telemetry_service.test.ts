/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import { infraTelemetryEvents } from './telemetry_events';

import { TelemetryService } from './telemetry_service';
import { InfraTelemetryEventTypes } from './types';

describe('TelemetryService', () => {
  let service: TelemetryService;

  beforeEach(() => {
    service = new TelemetryService();
  });

  const getSetupParams = () => {
    const mockCoreStart = coreMock.createSetup();
    return {
      analytics: mockCoreStart.analytics,
    };
  };

  describe('#setup()', () => {
    it('should register all the custom events', () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);

      expect(setupParams.analytics.registerEventType).toHaveBeenCalledTimes(
        infraTelemetryEvents.length
      );

      infraTelemetryEvents.forEach((eventConfig, pos) => {
        expect(setupParams.analytics.registerEventType).toHaveBeenNthCalledWith(
          pos + 1,
          eventConfig
        );
      });
    });
  });

  describe('#start()', () => {
    it('should return all the available tracking methods', () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      expect(telemetry).toHaveProperty('reportHostEntryClicked');
      expect(telemetry).toHaveProperty('reportHostFlyoutFilterRemoved');
      expect(telemetry).toHaveProperty('reportHostFlyoutFilterAdded');
      expect(telemetry).toHaveProperty('reportHostsViewQuerySubmitted');
    });
  });

  describe('#reportHostEntryClicked', () => {
    it('should report hosts entry click with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostEntryClicked({
        hostname: 'hostname.test',
        cloud_provider: 'gcp',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED,
        {
          hostname: 'hostname.test',
          cloud_provider: 'gcp',
        }
      );
    });

    it('should report hosts entry click with cloud provider equal to "unknown" if not exist', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostEntryClicked({
        hostname: 'hostname.test',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED,
        {
          hostname: 'hostname.test',
          cloud_provider: 'unknown',
        }
      );
    });
  });

  describe('#reportHostsViewQuerySubmitted', () => {
    it('should report hosts query and filtering submission with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostsViewQuerySubmitted({
        control_filter_fields: ['host.os.name'],
        filter_fields: [],
        interval: 'interval(now-1h)',
        with_query: false,
        limit: 100,
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOSTS_VIEW_QUERY_SUBMITTED,
        {
          control_filter_fields: ['host.os.name'],
          filter_fields: [],
          interval: 'interval(now-1h)',
          with_query: false,
          limit: 100,
        }
      );
    });
  });

  describe('#reportHostFlyoutFilterRemoved', () => {
    it('should report Host Flyout Filter Removed click with field name', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostFlyoutFilterRemoved({
        field_name: 'agent.version',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOST_FLYOUT_FILTER_REMOVED,
        {
          field_name: 'agent.version',
        }
      );
    });
  });

  describe('#reportHostFlyoutFilterAdded', () => {
    it('should report Host Flyout Filter Added click with field name', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostFlyoutFilterAdded({
        field_name: 'agent.version',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOST_FLYOUT_FILTER_ADDED,
        {
          field_name: 'agent.version',
        }
      );
    });
  });

  describe('#reportHostsViewTotalHostCountRetrieved', () => {
    it('should report Host Flyout Filter Added click with field name', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportHostsViewTotalHostCountRetrieved({
        total: 300,
        with_filters: true,
        with_query: false,
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.HOST_VIEW_TOTAL_HOST_COUNT_RETRIEVED,
        {
          total: 300,
          with_filters: true,
          with_query: false,
        }
      );
    });
  });

  describe('#reportAssetDetailsFlyoutViewed', () => {
    it('should report asset details viewed in flyout with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportAssetDetailsFlyoutViewed({
        componentName: 'infraAssetDetailsFlyout',
        assetType: 'host',
        tabId: 'overview',
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.ASSET_DETAILS_FLYOUT_VIEWED,
        {
          componentName: 'infraAssetDetailsFlyout',
          assetType: 'host',
          tabId: 'overview',
        }
      );
    });
  });

  describe('#reportAssetDetailsPageViewed', () => {
    it('should report asset details viewed in full page with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportAssetDetailsPageViewed({
        componentName: 'infraAssetDetailsPage',
        assetType: 'host',
        tabId: 'overview',
        integrations: ['nginx'],
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.ASSET_DETAILS_PAGE_VIEWED,
        {
          componentName: 'infraAssetDetailsPage',
          assetType: 'host',
          tabId: 'overview',
          integrations: ['nginx'],
        }
      );
    });
  });

  describe('#reportAssetDashboardLoaded', () => {
    it('should report asset details viewed in full page with properties', async () => {
      const setupParams = getSetupParams();
      service.setup(setupParams);
      const telemetry = service.start();

      telemetry.reportAssetDashboardLoaded({
        assetType: 'host',
        state: true,
        filtered_by: ['assetId'],
      });

      expect(setupParams.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(setupParams.analytics.reportEvent).toHaveBeenCalledWith(
        InfraTelemetryEventTypes.ASSET_DASHBOARD_LOADED,
        {
          assetType: 'host',
          state: true,
          filtered_by: ['assetId'],
        }
      );
    });
  });
});
