/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('notification_policy', () => {
    loadTestFile(require.resolve('./create_notification_policy'));
    loadTestFile(require.resolve('./get_notification_policy'));
    loadTestFile(require.resolve('./list_notification_policies'));
    loadTestFile(require.resolve('./update_notification_policy'));
    loadTestFile(require.resolve('./update_notification_policy_api_key'));
    loadTestFile(require.resolve('./delete_notification_policy'));
    loadTestFile(require.resolve('./enable_notification_policy'));
    loadTestFile(require.resolve('./disable_notification_policy'));
    loadTestFile(require.resolve('./snooze_notification_policy'));
    loadTestFile(require.resolve('./unsnooze_notification_policy'));
    loadTestFile(require.resolve('./bulk_action_notification_policies'));
  });
}
