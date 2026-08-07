/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

/**
 * Legacy Cases group2 functional config, pinned with
 * `--xpack.cases.templates.enabled=false` and
 * `--xpack.cases.casesRedesign.settings=false` so the legacy in-page
 * custom-fields / templates sections keep rendering once those plugin defaults
 * flip to ON. This config runs `index_legacy.ts` (only the legacy
 * `configure_legacy` suite). The default flag-ON suite runs under `config.ts`.
 */
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../../config.base.ts'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('./index_legacy')],
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--xpack.cases.templates.enabled=false',
        '--xpack.cases.casesRedesign.settings=false',
      ],
    },
    junit: {
      reportName: 'Chrome X-Pack UI Functional Tests with ES SSL - Cases - group 2 (legacy)',
    },
  };
}
