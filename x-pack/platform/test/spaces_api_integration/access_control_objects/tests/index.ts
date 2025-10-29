/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const es = getService('es');
  const security = getService('security');

  const createSimpleUser = async (roles: string[] = ['viewer']) => {
    await es.security.putUser({
      username: 'simple_user',
      refresh: 'wait_for',
      password: 'changeme',
      roles,
    });
  };

  describe('Platform Security - Access Control Objects', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser();
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    loadTestFile(require.resolve('./apis/create.ts'));
    loadTestFile(require.resolve('./apis/bulk_create.ts'));

    loadTestFile(require.resolve('./apis/update.ts'));
    loadTestFile(require.resolve('./apis/bulk_update.ts'));

    loadTestFile(require.resolve('./apis/delete.ts'));
    loadTestFile(require.resolve('./apis/bulk_delete.ts'));

    loadTestFile(require.resolve('./apis/change_access_mode.ts'));
    loadTestFile(require.resolve('./apis/change_ownership.ts'));

    loadTestFile(require.resolve('./apis/default.ts'));
  });
}
