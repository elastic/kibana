/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import { INTERNAL_CASES_SPACE_SETTINGS_URL } from '@kbn/cases-plugin/common/constants';
import { DEFAULT_CASE_STATUSES } from '@kbn/cases-plugin/common/utils/statuses';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createCase, deleteAllCaseItems, updateCase } from '../../../common/lib/api';
import { getPostCaseRequest } from '../../../common/lib/mock';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('custom statuses turned off', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('rejects a PATCH that sets status_key', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest({ owner: 'cases' }));

      const { body } = await supertest
        .patch('/api/cases')
        .set('kbn-xsrf', 'true')
        .send({ cases: [{ id: theCase.id, version: theCase.version, status_key: 'open' }] })
        .expect(400);

      expect(body.message).to.contain('Custom statuses are turned off.');
    });

    it('keeps status-only writes and returns no status_key', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest({ owner: 'cases' }));
      expect(theCase).not.to.have.property('status_key');

      const [closed] = await updateCase({
        supertest,
        params: {
          cases: [{ id: theCase.id, version: theCase.version, status: CaseStatuses.closed }],
        },
      });

      expect(closed.status).to.be(CaseStatuses.closed);
      expect(closed).not.to.have.property('status_key');
    });

    it('rejects saving space statuses', async () => {
      await supertest
        .put(INTERNAL_CASES_SPACE_SETTINGS_URL)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'kibana')
        .send({ statuses: DEFAULT_CASE_STATUSES })
        .expect(400);
    });
  });
};
