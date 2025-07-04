/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, loadTestFile }: FtrProviderContext) {
  describe('Reporting APIs', function () {
    before(async () => {
      const reportingAPI = getService('reportingAPI');
      await reportingAPI.logTaskManagerHealth();
      await reportingAPI.createDataAnalystRole();
      await reportingAPI.createTestReportingUserRole();
      await reportingAPI.createDataAnalyst();
      await reportingAPI.createTestReportingUser();
      await reportingAPI.createManageReportingUserRole();
      await reportingAPI.createManageReportingUser();
    });

    loadTestFile(require.resolve('./bwc_existing_indexes'));
    loadTestFile(require.resolve('./datastream'));
    loadTestFile(require.resolve('./default_reporting_user_role'));
    loadTestFile(require.resolve('./ilm_migration_apis'));
    loadTestFile(require.resolve('./security_roles_privileges'));
    loadTestFile(require.resolve('./spaces'));
    loadTestFile(require.resolve('./list_scheduled_reports'));
    loadTestFile(require.resolve('./disable_scheduled_reports'));
    loadTestFile(require.resolve('./list_jobs'));

    // CSV-specific
    loadTestFile(require.resolve('./csv/csv_v2'));
    loadTestFile(require.resolve('./csv/csv_v2_esql'));
    loadTestFile(require.resolve('./csv/generate_csv_discover'));

    // Screenshot-specific
    loadTestFile(require.resolve('./screenshot/network_policy'));
    loadTestFile(require.resolve('./screenshot/validation'));
  });
}
