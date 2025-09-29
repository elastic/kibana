/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUsersAndRoles } from '../../../common/lib/create_users_and_roles';
import { SPACE_1, SPACE_2, SPACE_3 } from '../../../common/lib/spaces';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile, getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const spacesService = getService('spaces');

  const createSpaces = async () => {
    await spacesService.create(SPACE_1);
    await spacesService.create(SPACE_2);
    await spacesService.create({ ...SPACE_3, solution: 'es' });
  };

  const deleteSpaces = async () => {
    await spacesService.delete(SPACE_1.id);
    await spacesService.delete(SPACE_2.id);
    await spacesService.delete(SPACE_3.id);
  };

  describe('spaces api with security', function () {
    this.tags('skipFIPS');

    before(async () => {
      await createUsersAndRoles(es, supertest);
      await createSpaces();
    });

    after(async () => {
      await deleteSpaces();
    });

    loadTestFile(require.resolve('./resolve_copy_to_space_conflicts'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./update'));
  });
}
