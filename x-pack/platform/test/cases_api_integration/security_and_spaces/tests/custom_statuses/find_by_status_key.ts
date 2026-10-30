/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createCase, deleteAllCaseItems, findCases, updateCase } from '../../../common/lib/api';
import { getPostCaseRequest } from '../../../common/lib/mock';
import { SETTINGS_WITH_CUSTOM_STATUSES, putSpaceSettings, removeStatusKey } from './helpers';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('find by status_key', () => {
    let legacyCaseId: string;
    let openCaseId: string;
    let triageCaseId: string;
    let duplicateCaseId: string;

    before(async () => {
      await putSpaceSettings({ supertest, settings: SETTINGS_WITH_CUSTOM_STATUSES });

      const [legacyCase, openCase, triageCase, duplicateCase] = await Promise.all([
        createCase(supertest, getPostCaseRequest({ title: 'legacy' })),
        createCase(supertest, getPostCaseRequest({ title: 'open' })),
        createCase(supertest, { ...getPostCaseRequest({ title: 'triage' }), status_key: 'triage' }),
        createCase(supertest, getPostCaseRequest({ title: 'duplicate' })),
      ]);

      await removeStatusKey(es, legacyCase.id);
      await updateCase({
        supertest,
        params: {
          cases: [
            { id: duplicateCase.id, version: duplicateCase.version, status_key: 'duplicate' },
          ],
        },
      });

      legacyCaseId = legacyCase.id;
      openCaseId = openCase.id;
      triageCaseId = triageCase.id;
      duplicateCaseId = duplicateCase.id;
    });

    after(async () => {
      await deleteAllCaseItems(es);
    });

    const findIds = async (statusKey: string | string[]) => {
      const { cases } = await findCases({ supertest, query: { status_key: statusKey } });
      return cases.map(({ id }) => id).sort();
    };

    it('matches a custom status by key', async () => {
      expect(await findIds('triage')).to.eql([triageCaseId]);
    });

    it('matches the cases without a key for a default status', async () => {
      expect(await findIds('open')).to.eql([legacyCaseId, openCaseId].sort());
    });

    it('matches several keys', async () => {
      expect(await findIds(['triage', 'duplicate'])).to.eql([triageCaseId, duplicateCaseId].sort());
    });

    it('keeps the status counts per category', async () => {
      const res = await findCases({ supertest, query: { status_key: 'triage' } });

      expect(res.count_open_cases).to.be(3);
      expect(res.count_closed_cases).to.be(1);
    });

    it('rejects more than 50 keys', async () => {
      await findCases({
        supertest,
        query: { status_key: Array.from({ length: 51 }, (_, index) => `status_${index}`) },
        expectedHttpCode: 400,
      });
    });
  });
};
