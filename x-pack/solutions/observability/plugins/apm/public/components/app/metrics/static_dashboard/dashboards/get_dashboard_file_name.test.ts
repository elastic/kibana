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
      telemetrySdkName: undefined,
      filename: 'classic_apm-apm-java',
    },
    {
      agentName: 'iOS/swift',
      telemetrySdkName: undefined,
      filename: 'classic_apm-apm-ios_swift',
    },
    {
      agentName: 'android/java',
      telemetrySdkName: undefined,
      filename: 'classic_apm-apm-android_java',
    },
    {
      agentName: 'opentelemetry/java/test/elastic',
      filename: 'classic_apm-edot-java',
    },
    {
      agentName: 'opentelemetry/java/elastic',
      telemetrySdkName: undefined,
      filename: 'classic_apm-edot-java',
    },
    {
      agentName: 'test/test/test/something-else/elastic',
      telemetrySdkName: undefined,
      filename: undefined,
    },
    {
      agentName: 'opentelemetry/java/elastic',
      telemetrySdkName: 'opentelementry',
      filename: 'otel_native-edot-java',
    },
    {
      agentName: 'opentelemetry/nodejs/nodejs-agent/elastic',
      telemetrySdkName: 'opentelementry',
      filename: 'otel_native-edot-nodejs',
    },
    {
      agentName: 'opentelemetry/nodejs/test/nodejs-agent',
      telemetrySdkName: 'opentelementry',
      filename: 'otel_native-otel_other-nodejs',
    },
    {
      agentName: 'opentelemetry/java/test/something-else/',
      telemetrySdkName: 'opentelementry',
      filename: 'otel_native-otel_other-java',
    },
    {
      agentName: 'otlp/nodejs',
      telemetrySdkName: 'opentelementry',
      filename: 'otel_native-otel_other-nodejs',
    },
    {
      agentName: 'otlp/Android',
      telemetrySdkName: 'opentelementry',
      filename: 'otel_native-otel_other-android',
    },
    {
      agentName: 'test/java/test/something-else/',
      telemetrySdkName: 'test',
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
      telemetrySdkName: 'opentelemetry',
      filename: undefined,
    },
  ])(
    'for the agent name $agentName and telemetry sdk $telemetrySdkName return $filename',
    ({ agentName, telemetrySdkName, filename }) => {
      expect(getDashboardFileName({ agentName, telemetrySdkName })).toStrictEqual(filename);
    }
  );
});
