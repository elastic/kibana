/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getFilesAttachmentReq, getPostCaseRequest } from '../../../../common/lib/mock';
import { createCase, createComment, deleteAllCaseItems } from '../../../../common/lib/api';

const OWNER = 'securitySolutionFixture';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('cases client getCasesByAttachmentIDs (legacy rows)', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('finds the cases of a file whose legacy rows keep its id only in their references', async () => {
      const [caseA, caseB] = await Promise.all([
        createCase(supertest, getPostCaseRequest({ owner: OWNER })),
        createCase(supertest, getPostCaseRequest({ owner: OWNER })),
      ]);
      for (const { id } of [caseA, caseB]) {
        await createComment({
          supertest,
          caseId: id,
          params: getFilesAttachmentReq({ externalReferenceId: 'file-1' }),
        });
      }

      const { body } = await supertest
        .post('/api/cases_fixture/cases:getCasesByAttachmentIds')
        .set('kbn-xsrf', 'true')
        .send({ type: 'file', owner: OWNER, attachmentIds: ['file-1', 'file-none'] })
        .expect(200);

      expect(body.length).to.be(1);
      expect(body[0].attachmentId).to.be('file-1');
      expect([...body[0].caseIds].sort()).to.eql([caseA.id, caseB.id].sort());
    });
  });
};
