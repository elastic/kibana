/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDashboardFileName, parseMajorVersion } from './get_dashboard_file_name';

const apmAgent = [
  {
    agentName: 'java',
    telemetrySdkName: undefined,
    telemetrySdkLanguage: undefined,
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'classic_apm-apm-java-default',
    },
  },
  {
    agentName: 'iOS/swift',
    telemetrySdkName: undefined,
    telemetrySdkLanguage: undefined,
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'classic_apm-apm-ios_swift-default',
    },
  },
  {
    agentName: 'java',
    telemetrySdkName: 'opentelemetry',
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'otel_native-apm-java-default',
    },
  },
];
const edotSdk = [
  {
    agentName: 'opentelemetry/java/test/elastic',
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'classic_apm-edot-java-default',
    },
  },
  {
    agentName: 'opentelemetry/java/elastic',
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'classic_apm-edot-java-default',
    },
  },
  {
    agentName: 'opentelemetry/java/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'java',
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'otel_native-edot-java-default',
    },
  },
  {
    agentName: 'opentelemetry/nodejs/nodejs-agent/elastic',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'otel_native-edot-nodejs-default',
    },
  },
];
const vanillaOtelSdk = [
  {
    agentName: 'opentelemetry/java',
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'classic_apm-otel_other-java-default',
    },
  },
  {
    agentName: 'opentelemetry/nodejs/test/nodejs-agent',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'otel_native-otel_other-nodejs-default',
    },
  },
  {
    agentName: 'opentelemetry/java/test/something-else/',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'java',
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'otel_native-otel_other-java-default',
    },
  },
  {
    agentName: 'otlp/nodejs',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'nodejs',
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'otel_native-otel_other-nodejs-default',
    },
  },
  {
    agentName: 'otlp/Android',
    telemetrySdkName: 'opentelemetry',
    telemetrySdkLanguage: 'android',
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'otel_native-otel_other-android-default',
    },
  },
  {
    agentName: 'opentelemetry/go',
    telemetrySdkName: undefined,
    telemetrySdkLanguage: undefined,
    expected: {
      versionedFileName: undefined,
      defaultFileName: 'classic_apm-otel_other-go-default',
    },
  },
];
const noFilenameCases = [
  {
    agentName: 'test/java/test/something-else/',
    telemetrySdkName: undefined,
    telemetrySdkLanguage: undefined,
    expected: { versionedFileName: undefined, defaultFileName: undefined },
  },
  {
    agentName: 'otlp',
    expected: { versionedFileName: undefined, defaultFileName: undefined },
  },
  {
    agentName: 'elastic',
    expected: { versionedFileName: undefined, defaultFileName: undefined },
  },
  {
    agentName: 'my-awesome-agent/otel',
    telemetrySdkName: 'opentelemetry',
    expected: { versionedFileName: undefined, defaultFileName: undefined },
  },
];

describe('getDashboardFileName', () => {
  describe('apmAgent', () => {
    it.each(apmAgent)(
      'for agent $agentName with sdk $telemetrySdkName returns correct filenames',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, expected }) => {
        expect(
          getDashboardFileName({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toStrictEqual(expected);
      }
    );
  });

  describe('vanillaOtelSdk', () => {
    it.each(vanillaOtelSdk)(
      'for agent $agentName with sdk $telemetrySdkName returns correct filenames',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, expected }) => {
        expect(
          getDashboardFileName({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toStrictEqual(expected);
      }
    );
  });

  describe('edotSdk', () => {
    it.each(edotSdk)(
      'for agent $agentName with sdk $telemetrySdkName returns correct filenames',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, expected }) => {
        expect(
          getDashboardFileName({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toStrictEqual(expected);
      }
    );
  });

  describe('noFilenameCases', () => {
    it.each(noFilenameCases)(
      'for agent $agentName returns undefined filenames',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, expected }) => {
        expect(
          getDashboardFileName({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toStrictEqual(expected);
      }
    );
  });

  describe('with runtimeVersion', () => {
    it('returns versioned and default filenames', () => {
      expect(
        getDashboardFileName({
          agentName: 'opentelemetry/java/elastic',
          telemetrySdkName: 'opentelemetry',
          telemetrySdkLanguage: 'java',
          runtimeVersion: '17.0.1',
        })
      ).toStrictEqual({
        versionedFileName: 'otel_native-edot-java-v17',
        defaultFileName: 'otel_native-edot-java-default',
      });
    });

    it('extracts only the major version number', () => {
      expect(
        getDashboardFileName({
          agentName: 'java',
          runtimeVersion: '6.100.6',
        })
      ).toStrictEqual({
        versionedFileName: 'classic_apm-apm-java-v6',
        defaultFileName: 'classic_apm-apm-java-default',
      });
    });

    it('returns no versioned filename when runtimeVersion is undefined', () => {
      expect(
        getDashboardFileName({
          agentName: 'opentelemetry/java/elastic',
          telemetrySdkName: 'opentelemetry',
          telemetrySdkLanguage: 'java',
          runtimeVersion: undefined,
        })
      ).toStrictEqual({
        versionedFileName: undefined,
        defaultFileName: 'otel_native-edot-java-default',
      });
    });

    it('returns no versioned filename when runtimeVersion is invalid', () => {
      expect(
        getDashboardFileName({
          agentName: 'java',
          runtimeVersion: 'beta',
        })
      ).toStrictEqual({
        versionedFileName: undefined,
        defaultFileName: 'classic_apm-apm-java-default',
      });
    });

    it('returns EDOT .NET 9 versioned filename', () => {
      expect(
        getDashboardFileName({
          agentName: 'opentelemetry/dotnet/elastic',
          runtimeVersion: '9.0.0',
        })
      ).toStrictEqual({
        versionedFileName: 'classic_apm-edot-dotnet-v9',
        defaultFileName: 'classic_apm-edot-dotnet-default',
      });
    });
  });
});

describe('parseMajorVersion', () => {
  it.each([
    { input: '6', expected: '6' },
    { input: '6.10', expected: '6' },
    { input: '6.100.6', expected: '6' },
    { input: '17.0.1', expected: '17' },
    { input: '21', expected: '21' },
    { input: '0.9.1', expected: '0' },
    { input: undefined, expected: undefined },
    { input: '', expected: undefined },
    { input: 'beta', expected: undefined },
    { input: 'v6.10', expected: undefined },
  ])('parseMajorVersion($input) returns $expected', ({ input, expected }) => {
    expect(parseMajorVersion(input)).toBe(expected);
  });
});
