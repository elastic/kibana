/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  isMetricsTabHidden,
  isMetricsJVMsTabHidden,
  isInfraTabHidden,
} from '.';

describe('APM service template', () => {
  describe('isMetricsTabHidden', () => {
    describe('hides metrics tab', () => {
      [
        { agentName: undefined },
        { agentName: 'js-base' },
        { agentName: 'rum-js' },
        { agentName: 'opentelemetry/webjs' },
        { agentName: 'java' },
        { agentName: 'opentelemetry/java' },
        { agentName: 'ios/swift' },
        { agentName: 'ruby', runtimeName: 'jruby' },
        { runtimeName: 'aws_lambda' },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isMetricsTabHidden(input)).toBeTruthy();
        });
      });
    });
    describe('shows metrics tab', () => {
      [
        { agentName: 'ruby', runtimeName: 'ruby' },
        { agentName: 'ruby' },
        { agentName: 'dotnet' },
        { agentName: 'go' },
        { agentName: 'nodejs' },
        { agentName: 'php' },
        { agentName: 'python' },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isMetricsTabHidden(input)).toBeFalsy();
        });
      });
    });
  });
  describe('isMetricsJVMsTabHidden', () => {
    describe('hides metrics JVMs tab', () => {
      [
        { agentName: undefined },
        { agentName: 'ruby', runtimeName: 'ruby' },
        { agentName: 'ruby' },
        { agentName: 'dotnet' },
        { agentName: 'go' },
        { agentName: 'nodejs' },
        { agentName: 'php' },
        { agentName: 'python' },
        { runtimeName: 'aws_lambda' },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isMetricsJVMsTabHidden(input)).toBeTruthy();
        });
      });
    });
    describe('shows metrics JVMs tab', () => {
      [
        { agentName: 'java' },
        { agentName: 'opentelemetry/java' },
        { agentName: 'ruby', runtimeName: 'jruby' },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isMetricsJVMsTabHidden(input)).toBeFalsy();
        });
      });
    });
  });
  describe('isInfraTabHidden', () => {
    describe('hides infra tab', () => {
      [
        { agentName: undefined },
        { agentName: 'js-base' },
        { agentName: 'rum-js' },
        { agentName: 'opentelemetry/webjs' },
        { agentName: 'ios/swift' },
        { runtimeName: 'aws_lambda' },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isInfraTabHidden(input)).toBeTruthy();
        });
      });
    });
    describe('shows infra tab', () => {
      [
        { agentName: 'ruby', runtimeName: 'ruby' },
        { agentName: 'ruby', runtimeName: 'jruby' },
        { agentName: 'ruby' },
        { agentName: 'dotnet' },
        { agentName: 'go' },
        { agentName: 'nodejs' },
        { agentName: 'php' },
        { agentName: 'python' },
        { agentName: 'java' },
        { agentName: 'opentelemetry/java' },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isInfraTabHidden(input)).toBeFalsy();
        });
      });
    });
  });
});
