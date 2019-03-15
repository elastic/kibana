/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyObject } from './lib/esqueue';

// TODO migrate other duplicate classes, functions

export const emptyAsyncFunc = async (_: AnyObject): Promise<any> => {
  Promise.resolve({});
};
export const TEST_OPTIONS = {
  enabled: true,
  queueIndex: '.code_internal-worker-queue',
  queueTimeout: 60 * 60 * 1000, // 1 hour by default
  updateFreqencyMs: 5 * 60 * 1000, // 5 minutes by default
  indexFrequencyMs: 24 * 60 * 60 * 1000, // 1 day by default
  lsp: {
    requestTimeoutMs: 5 * 60, // timeout a request over 30s
    detach: false,
    verbose: false,
  },
  security: {
    enableMavenImport: true,
    enableGradleImport: true,
    installNodeDependency: true,
  },
  repos: [],
  maxWorkspace: 5, // max workspace folder for each language server
  disableScheduler: true, // Temp option to disable all schedulers.
};
