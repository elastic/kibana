/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { of } from 'rxjs';

import type {
  TelemetryServiceSetupParams,
  TelemetryClientStart,
  TelemetryEventParams,
} from './types';
import { telemetryEvents } from './events/telemetry_events';
import { TelemetryClient } from './telemetry_client';

/**
 * Service that interacts with the Core's analytics module
 * to trigger custom event for Security Solution plugin features
 */
export class TelemetryService {
  constructor(private analytics: AnalyticsServiceSetup | null = null) {}

  public setup({ analytics }: TelemetryServiceSetupParams, context?: Record<string, unknown>) {
    this.analytics = analytics;
    if (context) {
      const context$ = of(context);

      analytics.registerContextProvider({
        name: 'detection_response',
        // RxJS Observable that emits every time the context changes.
        context$,
        // Similar to the `reportEvent` API, schema defining the structure of the expected output of the context$ observable.
        schema: {
          prebuiltRulesPackageVersion: {
            type: 'keyword',
            _meta: { description: 'The version of prebuilt rules', optional: true },
          },
        },
      });
    }
    telemetryEvents.forEach((eventConfig) =>
      analytics.registerEventType<TelemetryEventParams>(eventConfig)
    );
  }

  public start(): TelemetryClientStart {
    if (!this.analytics) {
      throw new Error(
        'The TelemetryService.setup() method has not been invoked, be sure to call it during the plugin setup.'
      );
    }

    return new TelemetryClient(this.analytics);
  }
}
