/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAgentIconKey } from './get_agent_icon';

const examples = {
  DotNet: 'dotnet', // Test for case sensitivity
  dotnet: 'dotnet',
  go: 'go',
  java: 'java',
  'js-base': 'rum',
  nodejs: 'nodejs',
  'opentelemetry/cpp': 'opentelemetry',
  'opentelemetry/dotnet': 'dotnet',
  'opentelemetry/erlang': 'opentelemetry',
  'opentelemetry/go': 'go',
  'opentelemetry/java': 'java',
  'opentelemetry/nodejs': 'nodejs',
  'opentelemetry/php': 'php',
  'opentelemetry/python': 'python',
  'opentelemetry/ruby': 'ruby',
  'opentelemetry/webjs': 'rum',
  otlp: 'opentelemetry',
  php: 'php',
  python: 'python',
  ruby: 'ruby',
  'rum-js': 'rum',
  'something else': undefined,
};

describe('getAgentIconKey', () => {
  Object.entries(examples).forEach(([key, value]) => {
    describe(`with ${key}`, () => {
      it(`returns ${value}`, () => {
        expect(getAgentIconKey(key)).toEqual(value);
      });
    });
  });
});
