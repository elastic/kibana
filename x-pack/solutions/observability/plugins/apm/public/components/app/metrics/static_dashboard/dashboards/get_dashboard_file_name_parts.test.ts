/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDashboardFileNameParts } from './get_dashboard_file_name_parts';

describe('getDashboardFileNameParts', () => {
  it.each([
    {
      agentName: 'java',
      telemetrySdkName: undefined,
      dataFormat: 'classic_apm',
      sdkName: 'apm',
      language: 'java',
    },
    { agentName: 'nodejs', dataFormat: 'classic_apm', sdkName: 'apm', language: 'nodejs' },
    {
      agentName: 'opentelemetry/nodejs/test/nodejs-agent',
      dataFormat: 'classic_apm',
      sdkName: 'otel_other',
      language: 'nodejs',
    },
    {
      agentName: 'opentelemetry/java/test/elastic',
      dataFormat: 'classic_apm',
      sdkName: 'edot',
      language: 'java',
    },
    {
      agentName: 'opentelemetry/java/elastic',
      telemetrySdkName: undefined,
      dataFormat: 'classic_apm',
      sdkName: 'edot',
      language: 'java',
    },
    {
      agentName: 'test/test/test/something-else/elastic',
      telemetrySdkName: undefined,
      dataFormat: 'classic_apm',
      sdkName: undefined,
      language: undefined,
    },
    {
      agentName: 'opentelemetry/java/elastic',
      telemetrySdkName: 'opentelementry',
      dataFormat: 'otel_native',
      sdkName: 'edot',
      language: 'java',
    },
    {
      agentName: 'opentelemetry/nodejs/nodejs-agent/elastic',
      telemetrySdkName: 'opentelementry',
      dataFormat: 'otel_native',
      sdkName: 'edot',
      language: 'nodejs',
    },
    {
      agentName: 'opentelemetry/nodejs/test/nodejs-agent',
      telemetrySdkName: 'opentelementry',
      dataFormat: 'otel_native',
      sdkName: 'otel_other',
      language: 'nodejs',
    },
    {
      agentName: 'opentelemetry/java/test/something-else/',
      telemetrySdkName: 'opentelementry',
      dataFormat: 'otel_native',
      sdkName: 'otel_other',
      language: 'java',
    },
    {
      agentName: 'test/java/test/something-else/',
      telemetrySdkName: 'test',
      dataFormat: 'otel_native',
      sdkName: undefined,
      language: undefined,
    },
  ])(
    'for the agent name $agentName and telemetry sdk $telemetrySdkName return {dataFormat: $dataFormat, sdkName: $sdkName, language: $language}',
    ({ agentName, telemetrySdkName, dataFormat, sdkName, language }) => {
      expect(getDashboardFileNameParts({ agentName, telemetrySdkName })).toStrictEqual({
        dataFormat,
        sdkName,
        language,
      });
    }
  );
});
