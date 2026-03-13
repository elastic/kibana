/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDashboardDimensions, parseMajorVersion } from './get_dashboard_dimensions';

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

describe('getDashboardDimensions', () => {
  describe('apmAgent', () => {
    it.each([
      {
        agentName: 'java',
        telemetrySdkName: undefined,
        telemetrySdkLanguage: undefined,
        expected: { dataFormat: 'classic_apm', sdkName: 'apm', language: 'java' },
      },
      {
        agentName: 'iOS/swift',
        telemetrySdkName: undefined,
        telemetrySdkLanguage: undefined,
        expected: { dataFormat: 'classic_apm', sdkName: 'apm', language: 'ios_swift' },
      },
      {
        agentName: 'java',
        telemetrySdkName: 'opentelemetry',
        expected: { dataFormat: 'otel_native', sdkName: 'apm', language: 'java' },
      },
    ])(
      'for agent $agentName with sdk $telemetrySdkName returns correct dimensions',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, expected }) => {
        expect(
          getDashboardDimensions({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toEqual(expected);
      }
    );
  });

  describe('edotSdk', () => {
    it.each([
      {
        agentName: 'opentelemetry/java/elastic',
        expected: { dataFormat: 'classic_apm', sdkName: 'edot', language: 'java' },
      },
      {
        agentName: 'opentelemetry/java/elastic',
        telemetrySdkName: 'opentelemetry',
        telemetrySdkLanguage: 'java',
        expected: { dataFormat: 'otel_native', sdkName: 'edot', language: 'java' },
      },
      {
        agentName: 'opentelemetry/nodejs/nodejs-agent/elastic',
        telemetrySdkName: 'opentelemetry',
        telemetrySdkLanguage: 'nodejs',
        expected: { dataFormat: 'otel_native', sdkName: 'edot', language: 'nodejs' },
      },
    ])(
      'for agent $agentName returns correct dimensions',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, expected }) => {
        expect(
          getDashboardDimensions({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toEqual(expected);
      }
    );
  });

  describe('vanillaOtelSdk', () => {
    it.each([
      {
        agentName: 'opentelemetry/java',
        expected: { dataFormat: 'classic_apm', sdkName: 'otel_other', language: 'java' },
      },
      {
        agentName: 'opentelemetry/nodejs/test/nodejs-agent',
        telemetrySdkName: 'opentelemetry',
        telemetrySdkLanguage: 'nodejs',
        expected: { dataFormat: 'otel_native', sdkName: 'otel_other', language: 'nodejs' },
      },
      {
        agentName: 'opentelemetry/go',
        telemetrySdkName: undefined,
        telemetrySdkLanguage: undefined,
        expected: { dataFormat: 'classic_apm', sdkName: 'otel_other', language: 'go' },
      },
    ])(
      'for agent $agentName returns correct dimensions',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, expected }) => {
        expect(
          getDashboardDimensions({ agentName, telemetrySdkName, telemetrySdkLanguage })
        ).toEqual(expected);
      }
    );
  });

  describe('with version', () => {
    it.each([
      {
        agentName: 'opentelemetry/java/elastic',
        telemetrySdkName: 'opentelemetry',
        telemetrySdkLanguage: 'java',
        runtimeVersion: '17',
        expected: { dataFormat: 'otel_native', sdkName: 'edot', language: 'java', version: '17' },
      },
      {
        agentName: 'opentelemetry/java/elastic',
        telemetrySdkName: 'opentelemetry',
        telemetrySdkLanguage: 'java',
        runtimeVersion: '17.0.1',
        expected: { dataFormat: 'otel_native', sdkName: 'edot', language: 'java', version: '17' },
      },
      {
        agentName: 'opentelemetry/java/elastic',
        telemetrySdkName: 'opentelemetry',
        telemetrySdkLanguage: 'java',
        runtimeVersion: '6.100.6',
        expected: { dataFormat: 'otel_native', sdkName: 'edot', language: 'java', version: '6' },
      },
      {
        agentName: 'opentelemetry/java/elastic',
        telemetrySdkName: 'opentelemetry',
        telemetrySdkLanguage: 'java',
        runtimeVersion: undefined,
        expected: { dataFormat: 'otel_native', sdkName: 'edot', language: 'java' },
      },
    ])(
      'for agent $agentName with runtimeVersion $runtimeVersion extracts major version',
      ({ agentName, telemetrySdkName, telemetrySdkLanguage, runtimeVersion, expected }) => {
        expect(
          getDashboardDimensions({
            agentName,
            telemetrySdkName,
            telemetrySdkLanguage,
            runtimeVersion,
          })
        ).toEqual(expected);
      }
    );
  });

  describe('unrecognized agents return undefined', () => {
    it.each([
      { agentName: 'test/java/test/something-else/' },
      { agentName: 'otlp' },
      { agentName: 'elastic' },
      { agentName: 'my-awesome-agent/otel', telemetrySdkName: 'opentelemetry' },
    ])('for agent $agentName returns undefined', ({ agentName, telemetrySdkName }) => {
      expect(getDashboardDimensions({ agentName, telemetrySdkName })).toBeUndefined();
    });
  });
});
