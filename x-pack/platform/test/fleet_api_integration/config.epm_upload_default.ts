/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseFleetApiConfig = await readConfigFile(require.resolve('./config.base.ts'));

  return {
    ...baseFleetApiConfig.getAll(),
    testFiles: [
      require.resolve('./apis/epm_upload_default/install_by_upload_registry_name'),
      require.resolve('./apis/epm_upload_default/install_by_upload_live_stream'),
      // Must run last: the successful install in this suite sets the process-wide upload
      // rate-limit cache; placing it before other upload suites risks 429 instead of
      // the expected status codes in those suites.
      require.resolve('./apis/epm_upload_default/upload_preflight_authz'),
    ],
    junit: {
      reportName: 'X-Pack EPM Upload Default API Integration Tests',
    },
  };
}
