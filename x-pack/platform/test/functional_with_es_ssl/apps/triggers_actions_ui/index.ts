/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Actions and Triggers app', function () {
    loadTestFile(require.resolve('./home_page'));
    loadTestFile(require.resolve('./alert_create_flyout'));
    loadTestFile(require.resolve('./connectors'));
    loadTestFile(require.resolve('./logs_list'));
    loadTestFile(require.resolve('./stack_alerts_page'));
    loadTestFile(require.resolve('./maintenance_windows'));
    loadTestFile(require.resolve('./email'));
    loadTestFile(require.resolve('./alert_deletion'));
  });
};
