/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_TASKS_URL } from '@kbn/cases-plugin/common/constants';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { createCase, deleteAllCaseItems } from '../../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('tasks', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('is not available below a Platinum license', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());

      await supertest
        .post(CASE_TASKS_URL.replace('{case_id}', theCase.id))
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .send({ title: 'Needs Platinum' })
        .expect(403);
    });
  });
};
