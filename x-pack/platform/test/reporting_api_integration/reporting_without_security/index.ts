/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('Reporting API Integration Tests with Security disabled', function () {
    this.tags('skipFIPS');
    before(async () => {
      const reportingAPI = getService('reportingAPI');
      await reportingAPI.logTaskManagerHealth();
    });

    loadTestFile(require.resolve('./csv/job_apis_csv'));
    loadTestFile(require.resolve('./schedule'));
    loadTestFile(require.resolve('./roll_datastream'));
  });
}
