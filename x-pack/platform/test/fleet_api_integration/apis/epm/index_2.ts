/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupTestUsers } from '../test_users';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('EPM Endpoints (part 2)', () => {
    before(async () => {
      await setupTestUsers(getService('security'));
    });
    loadTestFile(require.resolve('./bulk_upgrade'));
    loadTestFile(require.resolve('./bulk_uninstall'));
    loadTestFile(require.resolve('./bulk_install_upgrade'));
    loadTestFile(require.resolve('./bulk_install'));
    loadTestFile(require.resolve('./bulk_rollback'));
    loadTestFile(require.resolve('./update_assets'));
    loadTestFile(require.resolve('./data_stream'));
    loadTestFile(require.resolve('./package_install_complete'));
    loadTestFile(require.resolve('./remove_legacy_templates'));
    loadTestFile(require.resolve('./install_error_rollback'));
    loadTestFile(require.resolve('./final_pipeline'));
    loadTestFile(require.resolve('./custom_ingest_pipeline'));
    loadTestFile(require.resolve('./verification_key_id'));
    loadTestFile(require.resolve('./install_integration_in_multiple_spaces.ts'));
    loadTestFile(require.resolve('./install_hidden_datastreams'));
    loadTestFile(require.resolve('./bulk_get_assets'));
    loadTestFile(require.resolve('./install_dynamic_template_metric'));
    loadTestFile(require.resolve('./routing_rules'));
    loadTestFile(require.resolve('./install_runtime_field'));
    loadTestFile(require.resolve('./get_templates_inputs'));
    loadTestFile(require.resolve('./data_views'));
    loadTestFile(require.resolve('./custom_integrations'));
    loadTestFile(require.resolve('./rollback'));
    loadTestFile(require.resolve('./knowledge_base'));
  });
}
