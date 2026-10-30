/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq } from '../../../../common/lib/mock';
import {
  createCase,
  addAttachmentV2,
  getAuthWithSuperUser,
  deleteAllCaseItems,
  getSpaceUrlPrefix,
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

  describe('post_attachment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should create an attachment in space1', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const attachment = await addAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: unifiedCommentReq,
        auth: authSpace1,
      });

      expect(attachment.type).to.eql(unifiedCommentReq.type);
      expect(attachment.owner).to.eql(unifiedCommentReq.owner);
      expect(attachment.data?.content).to.eql(unifiedCommentReq.data.content);
    });

    it('should not create an attachment on a case in a different space', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      await addAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: unifiedCommentReq,
        auth: getAuthWithSuperUser('space2'),
        expectedHttpCode: 404,
      });
    });

    it('rejects data nested deeper than the maximum depth', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const depth = 10_000;
      // Sent as a raw string because the test client can't serialize input this deep.
      const body = `{"type":"comment","owner":"securitySolutionFixture","data":{"content":${'['.repeat(
        depth
      )}${']'.repeat(depth)}}}`;

      const { body: response } = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(authSpace1.space)}${CASES_URL}/${postedCase.id}/attachments`)
        .set('kbn-xsrf', 'true')
        .set('content-type', 'application/json')
        .send(body)
        .expect(400);

      expect(response.message).to.contain(
        'The data field is nested too deeply. The maximum depth is 30.'
      );
    });
  });
};
