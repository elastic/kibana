/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ loadTestFile, getService }: FtrProviderContext) => {
  const ml = getService('ml');

  describe('ML app', function () {
    this.tags(['ml']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    loadTestFile(require.resolve('./alert_flyout'));
    loadTestFile(require.resolve('./alerts_table_in_explorer'));
  });
};
