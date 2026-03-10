/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function alertingApiIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('alerting api integration security and spaces disabled - Group 5', function () {
    loadTestFile(require.resolve('./maintenance_window_disabled'));
    loadTestFile(require.resolve('./rules_settings_disabled'));
  });
}
