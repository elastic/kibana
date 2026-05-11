/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('rule_v2', () => {
    loadTestFile(require.resolve('./create_rule'));
    loadTestFile(require.resolve('./upsert_rule'));
    loadTestFile(require.resolve('./get_rule'));
    loadTestFile(require.resolve('./get_rule_tags'));
    loadTestFile(require.resolve('./list_rules'));
    loadTestFile(require.resolve('./update_rule'));
    loadTestFile(require.resolve('./delete_rule'));
    loadTestFile(require.resolve('./bulk_delete_rules'));
    loadTestFile(require.resolve('./bulk_enable_disable_rules'));
  });
}
