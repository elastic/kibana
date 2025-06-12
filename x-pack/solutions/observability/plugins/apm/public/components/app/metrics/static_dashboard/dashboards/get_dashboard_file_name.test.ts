/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDashboardFileName } from './get_dashboard_file_name';

const apmAgent = [
  {
    agentName: 'java',
    telemetrySdkName: undefined,
    telemetrySdkLanguage: undefined,
    filename: 'classic_apm-apm-java',
  },
  {
    agentName: 'iOS/swift',
    telemetrySdkName: undefined,
    telemetrySdkLanguage: undefined,
    filename: 'classic_apm-apm-ios_swift',
  },
  {
    agentName: 'java',
    telemetrySdkName: 'opentelemetry',
    filename: 'otel_native-apm-java',
  },
];
const edotSdk = [
  {
    agentName: 'opentelemetry/java/test/elastic',
    filename: 'classic_apm-edot-java',
  },
  {
    agentName: 'opentelemetry/java/elastic',
    filename: 'classic_apm-edot-java',
  },
  {
    agentName: 'opentelemetry/java/test/elastic',
    filename: 'classic_apm-edot-java',
  },
  {
    agentName: 'opentelemetry/java/elastic',
    filename: 'classic_apm-edot-java',
  },
  {
    agentName: 'opentelemetry/java/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'java',
    filename: 'otel_native-edot-java',
  },
  {
    agentName: 'opentelemetry/nodejs/nodejs-agent/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    filename: 'otel_native-edot-nodejs',
  },
];
const vanillaOtelSdk = [
  {
    agentName: 'opentelemetry/java',
    filename: 'classic_apm-otel_other-java',
  },
  {
    agentName: 'opentelemetry/nodejs/test/nodejs-agent',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    filename: 'otel_native-otel_other-nodejs',
  },
  {
    agentName: 'opentelemetry/java/test/something-else/',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'java',
    filename: 'otel_native-otel_other-java',
  },
  {
    agentName: 'otlp/nodejs',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    filename: 'otel_native-otel_other-nodejs',
  },
  {
    agentName: 'otlp/Android',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'android',
    filename: 'otel_native-otel_other-android',
  },
  {
    agentName: 'opentelemetry/go',
    telemetrySdkName: undefined,
    telemetrySdkLanguage: undefined,
    filename: 'classic_apm-otel_other-go',
  },
];
const noFilenameCases = [
  {
    agentName: 'test/java/test/something-else/',
    telemetrySdkName: undefined,
    telemetrySdkLanguage: undefined,
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
];

describe('getDashboardFileName', () => {
  describe('apmAgent', () => {
    it.each(apmAgent)(
      'for the agent name $agentName and open telemetry sdk name: $telemetrySdkName returns $filename',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, filename }) => {
        expect(
          getDashboardFileName({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toStrictEqual(filename);
      }
    );
  });
  describe('vanillaOtelSdk', () => {
    it.each(vanillaOtelSdk)(
      'for the agent name $agentName and open telemetry sdk name: $telemetrySdkName and language $telemetrySdkLanguage returns $filename',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, filename }) => {
        expect(
          getDashboardFileName({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toStrictEqual(filename);
      }
    );
  });
  describe('edotSdk', () => {
    it.each(edotSdk)(
      'for the agent name $agentName and open telemetry sdk name: $telemetrySdkName and language $telemetrySdkLanguage returns $filename',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, filename }) => {
        expect(
          getDashboardFileName({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toStrictEqual(filename);
      }
    );
  });
  describe('noFilenameCases', () => {
    it.each(noFilenameCases)(
      'for the agent name $agentName and open telemetry sdk name: $telemetrySdkName and language $telemetrySdkLanguage returns $filename',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, filename }) => {
        expect(
          getDashboardFileName({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toStrictEqual(filename);
      }
    );
  });
});
