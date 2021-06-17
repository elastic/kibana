/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentIconKey } from './get_agent_icon';

const examples = {
  DotNet: 'dotnet', // Test for case sensitivity
  dotnet: 'dotnet',
  erlang: 'erlang',
  go: 'go',
  nodejs: 'nodejs',
  ocaml: 'ocaml',
  'opentelemetry/cpp': 'opentelemetry',
  'opentelemetry/dotnet': 'dotnet',
  'opentelemetry/erlang': 'erlang',
  'opentelemetry/go': 'go',
  'opentelemetry/nodejs': 'nodejs',
  'opentelemetry/php': 'php',
  'opentelemetry/python': 'python',
  'opentelemetry/ruby': 'ruby',
  otlp: 'opentelemetry',
  php: 'php',
  python: 'python',
  ruby: 'ruby',
  rust: 'rust',
  'something else': undefined,

  // Java agents
  java: 'java',
  'opentelemetry/java': 'java',

  // RUM agents
  'js-base': 'rum',
  'opentelemetry/webjs': 'rum',
  'rum-js': 'rum',
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
