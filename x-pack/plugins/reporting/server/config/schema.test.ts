/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigSchema } from './schema';

describe('Reporting Config Schema', () => {
  it(`context {"dev":false,"dist":false} produces correct config`, () => {
    expect(ConfigSchema.validate({}, { dev: false, dist: false })).toMatchObject({
      capture: {
        browser: {
          autoDownload: true,
          chromium: { disableSandbox: false, proxy: { enabled: false } },
          type: 'chromium',
        },
        loadDelay: 3000,
        maxAttempts: 1,
        networkPolicy: {
          enabled: true,
          rules: [
            { allow: true, host: undefined, protocol: 'http:' },
            { allow: true, host: undefined, protocol: 'https:' },
            { allow: true, host: undefined, protocol: 'ws:' },
            { allow: true, host: undefined, protocol: 'wss:' },
            { allow: true, host: undefined, protocol: 'data:' },
            { allow: false, host: undefined, protocol: undefined },
          ],
        },
        viewport: { height: 1200, width: 1950 },
        zoom: 2,
      },
      csv: {
        checkForFormulas: true,
        enablePanelActionDownload: true,
        maxSizeBytes: 10485760,
        scroll: { duration: '30s', size: 500 },
      },
      encryptionKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      index: '.reporting',
      kibanaServer: {},
      poll: {
        jobCompletionNotifier: { interval: 10000, intervalErrorMultiplier: 5 },
        jobsRefresh: { interval: 5000, intervalErrorMultiplier: 5 },
      },
      queue: {
        indexInterval: 'week',
        pollEnabled: true,
        pollInterval: 3000,
        pollIntervalErrorMultiplier: 10,
        timeout: 120000,
      },
      roles: { allow: ['reporting_user'] },
    });
  });
  it(`context {"dev":false,"dist":true} produces correct config`, () => {
    expect(ConfigSchema.validate({}, { dev: false, dist: true })).toMatchObject({
      capture: {
        browser: {
          autoDownload: false,
          chromium: { disableSandbox: false, inspect: false, proxy: { enabled: false } },
          type: 'chromium',
        },
        loadDelay: 3000,
        maxAttempts: 3,
        networkPolicy: {
          enabled: true,
          rules: [
            { allow: true, host: undefined, protocol: 'http:' },
            { allow: true, host: undefined, protocol: 'https:' },
            { allow: true, host: undefined, protocol: 'ws:' },
            { allow: true, host: undefined, protocol: 'wss:' },
            { allow: true, host: undefined, protocol: 'data:' },
            { allow: false, host: undefined, protocol: undefined },
          ],
        },
        viewport: { height: 1200, width: 1950 },
        zoom: 2,
      },
      csv: {
        checkForFormulas: true,
        enablePanelActionDownload: true,
        maxSizeBytes: 10485760,
        scroll: { duration: '30s', size: 500 },
      },
      index: '.reporting',
      kibanaServer: {},
      poll: {
        jobCompletionNotifier: { interval: 10000, intervalErrorMultiplier: 5 },
        jobsRefresh: { interval: 5000, intervalErrorMultiplier: 5 },
      },
      queue: {
        indexInterval: 'week',
        pollEnabled: true,
        pollInterval: 3000,
        pollIntervalErrorMultiplier: 10,
        timeout: 120000,
      },
      roles: { allow: ['reporting_user'] },
    });
  });
});
