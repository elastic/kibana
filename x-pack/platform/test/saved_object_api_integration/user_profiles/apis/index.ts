/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createUsersAndRoles } from '../../common/lib/create_users_and_roles';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('saved objects user profiles integration', function () {
    before(async () => {
      await createUsersAndRoles(es, supertest);
    });

    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./bulk_create'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./bulk_update'));
  });
}
