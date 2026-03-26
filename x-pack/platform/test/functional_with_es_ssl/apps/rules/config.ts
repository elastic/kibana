/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../config.base.ts'));

  // Get base serverArgs and append 'unifiedRulesPage' to enableExperimental array
  const baseServerArgs = baseConfig.get('kbnTestServer.serverArgs') as string[];
  const updatedServerArgs = baseServerArgs.map((arg) => {
    if (arg.startsWith('--xpack.trigger_actions_ui.enableExperimental=')) {
      const jsonValue = arg.replace('--xpack.trigger_actions_ui.enableExperimental=', '');
      const experimentalFeatures = JSON.parse(jsonValue) as string[];
      if (!experimentalFeatures.includes('unifiedRulesPage')) {
        experimentalFeatures.push('unifiedRulesPage');
      }
      return `--xpack.trigger_actions_ui.enableExperimental=${JSON.stringify(
        experimentalFeatures
      )}`;
    }
    return arg;
  });

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('./index.ts')],
    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests with ES SSL - Triggers Actions UI - Rules',
    },
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: updatedServerArgs,
    },
  };
}
