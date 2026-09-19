/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq } from '../../../../common/lib/mock';
import {
  createCase,
  addAttachmentV2,
  updateAttachmentV2,
  getAuthWithSuperUser,
  deleteAllCaseItems,
} from '../../../../common/lib/api';

const unifiedCommentReq = {
  type: 'comment' as const,
  data: { content: 'This is a cool comment' },
  owner: 'securitySolutionFixture',
};

export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('put_attachment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should replace an attachment in space1', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const attachment = await addAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: unifiedCommentReq,
        auth: authSpace1,
      });

      const newContent = 'Well I decided to update my attachment. So what? Deal with it.';
      const replaced = await updateAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        attachmentId: attachment.id,
        req: {
          version: attachment.version,
          type: unifiedCommentReq.type,
          data: { content: newContent },
          owner: unifiedCommentReq.owner,
        },
        auth: authSpace1,
      });

      expect(replaced.data?.content).to.eql(newContent);
    });

    it('should not change the attachment type', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const attachment = await addAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: unifiedCommentReq,
        auth: authSpace1,
      });

      await updateAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        attachmentId: attachment.id,
        // Valid `security.alert` payload on its own — must fail because it differs
        // from the attachment's existing `comment` type, not because of its shape.
        req: {
          version: attachment.version,
          type: 'security.alert',
          attachmentId: ['alert-1'],
          metadata: { index: ['.alerts-security.alerts-default'], rule: { id: null, name: null } },
          owner: unifiedCommentReq.owner,
        },
        auth: authSpace1,
        expectedHttpCode: 400,
      });
    });

    it('should not change the attachment owner', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const attachment = await addAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: unifiedCommentReq,
        auth: authSpace1,
      });

      await updateAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        attachmentId: attachment.id,
        req: {
          version: attachment.version,
          type: unifiedCommentReq.type,
          data: { content: 'new content' },
          owner: 'changedOwner',
        },
        auth: authSpace1,
        expectedHttpCode: 400,
      });
    });

    it('should return a 409 when the version is stale', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const attachment = await addAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: unifiedCommentReq,
        auth: authSpace1,
      });

      await updateAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        attachmentId: attachment.id,
        req: {
          version: 'version-mismatch',
          type: unifiedCommentReq.type,
          data: { content: 'new content' },
          owner: unifiedCommentReq.owner,
        },
        auth: authSpace1,
        expectedHttpCode: 409,
      });
    });

    it('should not replace an attachment on a case in a different space', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const attachment = await addAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: unifiedCommentReq,
        auth: authSpace1,
      });

      await updateAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        attachmentId: attachment.id,
        req: {
          version: attachment.version,
          type: unifiedCommentReq.type,
          data: { content: 'new content' },
          owner: unifiedCommentReq.owner,
        },
        auth: getAuthWithSuperUser('space2'),
        expectedHttpCode: 404,
      });
    });
  });
};
