/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createCase,
  deleteAllCaseItems,
  findCaseUserActions,
  getCase,
  updateCase,
} from '../../../common/lib/api';
import { getPostCaseRequest } from '../../../common/lib/mock';
import { SETTINGS_WITH_CUSTOM_STATUSES, putSpaceSettings, removeStatusKey } from './helpers';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const getStatusUserActions = async (caseId: string) => {
    const { userActions } = await findCaseUserActions({
      supertest,
      caseID: caseId,
      options: { types: ['status'] },
    });
    return userActions;
  };

  describe('status writes', () => {
    beforeEach(async () => {
      await putSpaceSettings({ supertest, settings: SETTINGS_WITH_CUSTOM_STATUSES });
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('creates cases in the default not started status', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());

      expect(theCase.status).to.be(CaseStatuses.open);
      expect(theCase.status_key).to.be('open');
    });

    it('creates cases in a requested not started status', async () => {
      const theCase = await createCase(supertest, {
        ...getPostCaseRequest(),
        status_key: 'triage',
      });

      expect(theCase.status).to.be(CaseStatuses.open);
      expect(theCase.status_key).to.be('triage');
    });

    it('sets the category and closes the case for a done status key', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());

      const [updated] = await updateCase({
        supertest,
        params: { cases: [{ id: theCase.id, version: theCase.version, status_key: 'duplicate' }] },
      });

      expect(updated.status).to.be(CaseStatuses.closed);
      expect(updated.status_key).to.be('duplicate');
      expect(updated.closed_at).to.be.a('string');
      expect(updated.closed_by).to.not.be(null);

      const [statusAction] = await getStatusUserActions(theCase.id);
      expect(statusAction.payload).to.eql({ status: CaseStatuses.closed, status_key: 'duplicate' });
    });

    it('records a move within a category without closing or changing the status', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());

      const [updated] = await updateCase({
        supertest,
        params: { cases: [{ id: theCase.id, version: theCase.version, status_key: 'triage' }] },
      });

      expect(updated.status).to.be(CaseStatuses.open);
      expect(updated.status_key).to.be('triage');
      expect(updated.closed_at).to.be(null);
      expect(updated.closed_by).to.be(null);

      const statusActions = await getStatusUserActions(theCase.id);
      expect(statusActions.length).to.be(1);
      expect(statusActions[0].payload).to.eql({ status: CaseStatuses.open, status_key: 'triage' });
    });

    it('moves a case in a custom status to the default of the category named by a status-only write', async () => {
      const theCase = await createCase(supertest, {
        ...getPostCaseRequest(),
        status_key: 'triage',
      });

      const [updated] = await updateCase({
        supertest,
        params: {
          cases: [{ id: theCase.id, version: theCase.version, status: CaseStatuses.closed }],
        },
      });

      expect(updated.status).to.be(CaseStatuses.closed);
      expect(updated.status_key).to.be('closed');
      expect(updated.closed_at).to.be.a('string');
    });

    it('keeps a custom status when a status-only write names its current category', async () => {
      const theCase = await createCase(supertest, {
        ...getPostCaseRequest(),
        status_key: 'triage',
      });

      await updateCase({
        supertest,
        params: {
          cases: [{ id: theCase.id, version: theCase.version, status: CaseStatuses.open }],
        },
        expectedHttpCode: 406,
      });

      const unchanged = await getCase({ supertest, caseId: theCase.id });
      expect(unchanged.status_key).to.be('triage');
    });

    it('treats a legacy case without a key as being in its default status', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());
      await removeStatusKey(es, theCase.id);
      const legacyCase = await getCase({ supertest, caseId: theCase.id });
      expect(legacyCase.status_key).to.be(null);

      await updateCase({
        supertest,
        params: { cases: [{ id: legacyCase.id, version: legacyCase.version, status_key: 'open' }] },
        expectedHttpCode: 406,
      });
    });

    it('rejects an unknown key and a key that contradicts the status', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest());

      await updateCase({
        supertest,
        params: { cases: [{ id: theCase.id, version: theCase.version, status_key: 'missing' }] },
        expectedHttpCode: 400,
      });

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              status: CaseStatuses.open,
              status_key: 'duplicate',
            },
          ],
        },
        expectedHttpCode: 400,
      });
    });
  });
};
