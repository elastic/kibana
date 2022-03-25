/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isMetricsTabHidden, isJVMsTabHidden } from './';

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
        { agentName: 'opentelemetry/swift' },
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
  describe('isJVMsTabHidden', () => {
    describe('hides JVMs tab', () => {
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
          expect(isJVMsTabHidden(input)).toBeTruthy();
        });
      });
    });
    describe('shows JVMs tab', () => {
      [
        { agentName: 'java' },
        { agentName: 'opentelemetry/java' },
        { agentName: 'ruby', runtimeName: 'jruby' },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isJVMsTabHidden(input)).toBeFalsy();
        });
      });
    });
  });
});
