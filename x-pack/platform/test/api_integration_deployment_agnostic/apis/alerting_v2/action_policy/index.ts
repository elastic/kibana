/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('action_policy', () => {
    loadTestFile(require.resolve('./create_action_policy'));
    loadTestFile(require.resolve('./get_action_policy'));
    loadTestFile(require.resolve('./list_action_policies'));
    loadTestFile(require.resolve('./update_action_policy'));
    loadTestFile(require.resolve('./update_action_policy_api_key'));
    loadTestFile(require.resolve('./delete_action_policy'));
    loadTestFile(require.resolve('./enable_action_policy'));
    loadTestFile(require.resolve('./disable_action_policy'));
    loadTestFile(require.resolve('./snooze_action_policy'));
    loadTestFile(require.resolve('./unsnooze_action_policy'));
    loadTestFile(require.resolve('./bulk_action_action_policies'));
  });
}
