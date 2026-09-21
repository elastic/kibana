/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Case } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  addAttachmentV2,
  updateAttachmentV2,
  superUserSpace1Auth,
} from '../../../../common/lib/api';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  secOnly,
  superUser,
} from '../../../../common/lib/authentication/users';

const unifiedCommentReq = {
  type: 'comment' as const,
  data: { content: 'This is a cool comment' },
  owner: 'securitySolutionFixture',
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('attachments_crud', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should create and replace an attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      const created = await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: unifiedCommentReq,
      });
      expect(created.type).to.eql(unifiedCommentReq.type);

      const replaced = await updateAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId: created.id,
        req: { ...unifiedCommentReq, version: created.version, data: { content: 'updated' } },
      });
      expect(replaced.data?.content).to.eql('updated');
    });

    it('should reject a legacy-shaped attachment body', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: {
          type: 'user',
          comment: 'This is a cool comment',
          owner: 'securitySolutionFixture',
        } as unknown as typeof unifiedCommentReq,
        expectedHttpCode: 400,
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should create an attachment when the user has the correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [superUser, secOnly]) {
          await addAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: unifiedCommentReq,
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should not create an attachment when the user does not have correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead, globalRead]) {
          await addAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: unifiedCommentReq,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        }
      });

      it('should replace an attachment when the user has the correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [superUser, secOnly]) {
          const created = await addAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: unifiedCommentReq,
            auth: superUserSpace1Auth,
          });

          await updateAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            attachmentId: created.id,
            req: { ...unifiedCommentReq, version: created.version },
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should not replace an attachment when the user does not have correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead, globalRead]) {
          const created = await addAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: unifiedCommentReq,
            auth: superUserSpace1Auth,
          });

          await updateAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            attachmentId: created.id,
            req: { ...unifiedCommentReq, version: created.version },
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        }
      });
    });
  });
};
