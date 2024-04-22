/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isMetricsTabHidden, isInfraTabHidden } from '.';
import { ServerlessType } from '../../../../../common/serverless';

describe('APM service template', () => {
  describe('isMetricsTabHidden', () => {
    describe('hides metrics tab', () => {
      [
        { agentName: undefined },
        { agentName: 'js-base' },
        { agentName: 'rum-js' },
        { agentName: 'opentelemetry/webjs' },
        { serverlessType: ServerlessType.AWS_LAMBDA },
        { serverlessType: ServerlessType.AZURE_FUNCTIONS },
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
        { agentName: 'ruby', runtimeName: 'jruby' },
        { agentName: 'java' },
        { agentName: 'opentelemetry/java' },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isMetricsTabHidden(input)).toBeFalsy();
        });
      });
    });
  });
  describe('isInfraTabHidden', () => {
    describe('hides infra tab', () => {
      [
        { agentName: undefined, isInfraTabAvailable: true },
        { agentName: 'js-base', isInfraTabAvailable: true },
        { agentName: 'rum-js', isInfraTabAvailable: true },
        { agentName: 'opentelemetry/webjs', isInfraTabAvailable: true },
        {
          serverlessType: ServerlessType.AWS_LAMBDA,
          isInfraTabAvailable: true,
        },
        {
          serverlessType: ServerlessType.AZURE_FUNCTIONS,
          isInfraTabAvailable: true,
        },
        { agentName: 'nodejs', isInfraTabAvailable: false },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isInfraTabHidden(input)).toBeTruthy();
        });
      });
    });
    describe('shows infra tab', () => {
      [
        { agentName: 'ruby', runtimeName: 'ruby', isInfraTabAvailable: true },
        { agentName: 'ruby', runtimeName: 'jruby', isInfraTabAvailable: true },
        { agentName: 'ruby', isInfraTabAvailable: true },
        { agentName: 'dotnet', isInfraTabAvailable: true },
        { agentName: 'go', isInfraTabAvailable: true },
        { agentName: 'nodejs', isInfraTabAvailable: true },
        { agentName: 'php', isInfraTabAvailable: true },
        { agentName: 'python', isInfraTabAvailable: true },
        { agentName: 'java', isInfraTabAvailable: true },
        { agentName: 'opentelemetry/java', isInfraTabAvailable: true },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isInfraTabHidden(input)).toBeFalsy();
        });
      });
    });
  });
});
