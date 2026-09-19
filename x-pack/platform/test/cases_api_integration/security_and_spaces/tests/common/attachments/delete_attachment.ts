/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  deleteAttachmentV2,
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

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('delete_attachment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('rbac', () => {
      it('should delete an attachment when the user has the correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [superUser, secOnly]) {
          const patchedCase = await createComment({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: postCommentUserReq,
            auth: superUserSpace1Auth,
          });

          await deleteAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            attachmentId: patchedCase.comments![0].id,
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should not delete an attachment when the user does not have correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead, globalRead]) {
          const patchedCase = await createComment({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: postCommentUserReq,
            auth: superUserSpace1Auth,
          });

          await deleteAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            attachmentId: patchedCase.comments![0].id,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        }
      });
    });
  });
};
