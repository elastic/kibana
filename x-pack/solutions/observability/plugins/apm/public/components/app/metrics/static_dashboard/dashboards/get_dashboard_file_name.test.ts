/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDashboardFileName } from './get_dashboard_file_name';

describe('getDashboardFileName', () => {
  it.each([
    {
      agentName: 'java',
      hasOpenTelemetryFields: false,
      filename: 'classic_apm-apm-java',
    },
    {
      agentName: 'iOS/swift',
      hasOpenTelemetryFields: false,
      filename: 'classic_apm-apm-ios_swift',
    },
    {
      agentName: 'android/java',
      hasOpenTelemetryFields: false,
      filename: 'classic_apm-apm-android_java',
    },
    {
      agentName: 'opentelemetry/java/test/elastic',
      filename: 'classic_apm-edot-java',
    },
    {
      agentName: 'opentelemetry/java/elastic',
      hasOpenTelemetryFields: false,
      filename: 'classic_apm-edot-java',
    },
    {
      agentName: 'test/test/test/something-else/elastic',
      hasOpenTelemetryFields: false,
      filename: undefined,
    },
    {
      agentName: 'opentelemetry/java/elastic',
      hasOpenTelemetryFields: true,
      filename: 'otel_native-edot-java',
    },
    {
      agentName: 'opentelemetry/nodejs/nodejs-agent/elastic',
      hasOpenTelemetryFields: true,
      filename: 'otel_native-edot-nodejs',
    },
    {
      agentName: 'opentelemetry/nodejs/test/nodejs-agent',
      hasOpenTelemetryFields: true,
      filename: 'otel_native-otel_other-nodejs',
    },
    {
      agentName: 'opentelemetry/java/test/something-else/',
      hasOpenTelemetryFields: true,
      filename: 'otel_native-otel_other-java',
    },
    {
      agentName: 'otlp/nodejs',
      hasOpenTelemetryFields: true,
      filename: 'otel_native-otel_other-nodejs',
    },
    {
      agentName: 'otlp/Android',
      hasOpenTelemetryFields: true,
      filename: 'otel_native-otel_other-android',
    },
    {
      agentName: 'test/java/test/something-else/',
      hasOpenTelemetryFields: undefined,
      filename: undefined,
    },
    {
      agentName: 'otlp',
      filename: undefined,
    },
    {
      agentName: 'elastic',
      filename: undefined,
    },
    {
      agentName: 'my-awesome-agent/otel',
      hasOpenTelemetryFields: true,
      filename: undefined,
    },
  ])(
    'for the agent name $agentName and open telemetry is $hasOpenTelemetryFields return $filename',
    ({ agentName, hasOpenTelemetryFields, filename }) => {
      expect(getDashboardFileName({ agentName, hasOpenTelemetryFields })).toStrictEqual(filename);
    }
  );
});
