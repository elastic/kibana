/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const chromeConfig = await readConfigFile(require.resolve('./config.base.ts'));

  return {
    ...chromeConfig.getAll(),

    testFiles: [
      require.resolve('./apps/canvas'),
      require.resolve('./apps/security'),
      require.resolve('./apps/spaces'),
      require.resolve('./apps/watcher'),
    ],

    browser: {
      type: 'firefox',
    },

    suiteTags: {
      include: ['includeFirefox'],
      exclude: ['skipFirefox'],
    },

    junit: {
      reportName: 'Firefox XPack UI Functional Tests',
    },
  };
}
