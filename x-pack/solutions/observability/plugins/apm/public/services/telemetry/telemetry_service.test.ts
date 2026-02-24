/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import { apmTelemetryEventBasedTypes } from './telemetry_events';
import { TelemetryService } from './telemetry_service';
import {
  SearchQueryActions,
  TelemetryEventTypes,
  type SloCreateFlowStartedParams,
  type SloManageFlowStartedParams,
  type SloAppRedirectClickedParams,
} from './types';

describe('TelemetryService', () => {
  const service = new TelemetryService();
  const mockCoreStart = coreMock.createSetup();
  let telemetry: ReturnType<typeof service.start>;

  beforeEach(() => {
    jest.clearAllMocks();
    service.setup({ analytics: mockCoreStart.analytics });
    telemetry = service.start();
  });

  it('should register all events', () => {
    expect(mockCoreStart.analytics.registerEventType).toHaveBeenCalledTimes(
      apmTelemetryEventBasedTypes.length
    );
  });

  it('should report search query event with the properties', async () => {
    telemetry.reportSearchQuerySubmitted({
      kueryFields: ['service.name', 'span.id'],
      action: SearchQueryActions.Submit,
      timerange: 'now-15h-now',
    });

    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
      TelemetryEventTypes.SEARCH_QUERY_SUBMITTED,
      {
        kueryFields: ['service.name', 'span.id'],
        action: SearchQueryActions.Submit,
        timerange: 'now-15h-now',
      }
    );
  });

  it('should report slo info shown event with empty properties', async () => {
    telemetry.reportSloInfoShown();

    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
      TelemetryEventTypes.SLO_INFO_SHOWN,
      {}
    );
  });

  it('should report slo create flow started event with the properties', async () => {
    const params: SloCreateFlowStartedParams = {
      sloType: 'sli.apm.transactionDuration',
      location: 'service_inventory_actions',
    };

    telemetry.reportSloCreateFlowStarted(params);

    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
      TelemetryEventTypes.SLO_CREATE_FLOW_STARTED,
      params
    );
  });

  it('should report slo manage flow started event with the properties', async () => {
    const params: SloManageFlowStartedParams = {
      location: 'service_inventory_badge',
    };

    telemetry.reportSloManageFlowStarted(params);

    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
      TelemetryEventTypes.SLO_MANAGE_FLOW_STARTED,
      params
    );
  });

  it('should report slo app redirect clicked event with the properties', async () => {
    const params: SloAppRedirectClickedParams = {
      location: 'top_nav_button',
    };

    telemetry.reportSloAppRedirectClicked(params);

    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
      TelemetryEventTypes.SLO_APP_REDIRECT_CLICKED,
      params
    );
  });

  it('should report slo top nav clicked event with empty properties', async () => {
    telemetry.reportSloTopNavClicked();

    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockCoreStart.analytics.reportEvent).toHaveBeenCalledWith(
      TelemetryEventTypes.SLO_TOP_NAV_CLICKED,
      {}
    );
  });
});
