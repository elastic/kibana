/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import { apmTelemetryEventBasedTypes } from './telemetry_events';
import { TelemetryService } from './telemetry_service';
import { SearchQueryActions, TelemetryEventTypes } from './types';

describe('TelemetryService', () => {
  const service = new TelemetryService();

  const mockCoreStart = coreMock.createSetup();
  service.setup({ analytics: mockCoreStart.analytics });

  it('should register all events', () => {
    expect(mockCoreStart.analytics.registerEventType).toHaveBeenCalledTimes(
      apmTelemetryEventBasedTypes.length
    );
  });

  it('should report search query event with the properties', async () => {
    const telemetry = service.start();

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
});
