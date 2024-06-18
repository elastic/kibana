/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: '@kbn/test',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/plugins/cloud_security_posture'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/cloud_security_posture',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/cloud_security_posture/{common,public,server}/**/*.{ts,tsx}',
  ],
  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    // ignore all node_modules except the modules below (monaco-editor, monaco-yaml, react-monaco-editor, etc) which requires babel transforms to handle dynamic import()
    // since ESM modules are not natively supported in Jest yet (https://github.com/facebook/jest/issues/4842)
    '[/\\\\]node_modules(?![\\/\\\\](byte-size|monaco-editor|monaco-yaml|monaco-languageserver-types|monaco-marker-data-provider|monaco-worker-manager|vscode-languageserver-types|react-monaco-editor|d3-interpolate|d3-color|langchain|langsmith|@cfworker|gpt-tokenizer|flat|@langchain|msw|@bundled-es-modules))[/\\\\].+\\.js$',
    'packages/kbn-pm/dist/index.js',
    '[/\\\\]node_modules(?![\\/\\\\](langchain|langsmith|@langchain))/dist/[/\\\\].+\\.js$',
    '[/\\\\]node_modules(?![\\/\\\\](langchain|langsmith|@langchain))/dist/util/[/\\\\].+\\.js$',
  ],
};
