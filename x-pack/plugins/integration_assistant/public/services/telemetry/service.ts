/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { telemetryEventsSchemas } from './events';
import type { TelemetryEventType, TelemetryEventTypeData } from './types';

export interface TelemetryService {
  reportEvent: <T extends TelemetryEventType>(
    eventType: T,
    eventData: TelemetryEventTypeData<T>
  ) => void;
}

/**
 * Service that interacts with the Core's analytics module
 */
export class Telemetry {
  private analytics?: AnalyticsServiceSetup;

  public setup(analytics: AnalyticsServiceSetup) {
    this.analytics = analytics;

    Object.entries(telemetryEventsSchemas).forEach(([eventType, schema]) => {
      const event = { eventType, schema };
      analytics.registerEventType<TelemetryEventTypeData<TelemetryEventType>>(event);
    });
  }

  public start(): TelemetryService {
    const reportEvent = this.analytics?.reportEvent.bind(this.analytics);
    if (!reportEvent) {
      throw new Error(
        'The Telemetry.setup() method has not been invoked, be sure to call it during the plugin setup.'
      );
    }
    return { reportEvent };
  }
}
