/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_SO_TYPE,
  DISCOVER_SESSION_ATTACHMENT_TYPE,
  DISCOVER_SESSION_SO_TYPE,
  MAP_ATTACHMENT_TYPE,
  MAP_SO_TYPE,
} from '@kbn/cases-plugin/common/constants/attachments';
import type { BulkCreateAttachmentsRequestV2 } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  createCase,
  deleteAllCaseItems,
  findCaseUserActions,
} from '../../../../common/lib/api';

// Reference saved-object attachment types share a single contract: a
// `{ type, attachmentId, owner, metadata: { title, soType } }` payload that
// round-trips through create. They have no type-specific server behavior, so
// they are covered by one table-driven suite instead of a file each.
const REFERENCE_SO_TYPES = [
  {
    label: 'Dashboard',
    type: DASHBOARD_ATTACHMENT_TYPE,
    soType: DASHBOARD_SO_TYPE,
    attachmentId: 'dashboard-1',
    title: 'My dashboard',
  },
  {
    label: 'Discover session',
    type: DISCOVER_SESSION_ATTACHMENT_TYPE,
    soType: DISCOVER_SESSION_SO_TYPE,
    attachmentId: 'search-1',
    title: 'My Discover session',
  },
  {
    label: 'Map',
    type: MAP_ATTACHMENT_TYPE,
    soType: MAP_SO_TYPE,
    attachmentId: 'map-1',
    title: 'My map',
  },
] as const;

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Reference saved-object attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const so of REFERENCE_SO_TYPES) {
      describe(`${so.label} (${so.type})`, () => {
        const payload = {
          type: so.type,
          owner: 'securitySolutionFixture',
          attachmentId: so.attachmentId,
          metadata: {
            title: so.title,
            soType: so.soType,
          },
        };

        it('returns a unified-shaped response when the batch contains the attachment', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          const updatedCase = await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [payload] as unknown as BulkCreateAttachmentsRequestV2,
          });

          expect(updatedCase.comments?.length).to.be(1);
          const attachment = updatedCase.comments![0] as unknown as {
            type: string;
            attachmentId: string;
            metadata: { title: string; soType: string };
            owner: string;
          };
          expect(attachment.type).to.eql(so.type);
          expect(attachment.attachmentId).to.eql(so.attachmentId);
          expect(attachment.metadata).to.eql({ title: so.title, soType: so.soType });
          expect(attachment.owner).to.eql('securitySolutionFixture');
        });

        it('returns a unified-shaped response for a mixed batch (user comment + attachment)', async () => {
          const postedCase = await createCase(supertest, postCaseReq);
          const updatedCase = await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [postCommentUserReq, payload] as unknown as BulkCreateAttachmentsRequestV2,
          });

          expect(updatedCase.comments?.length).to.be(2);
          const attachment = updatedCase.comments!.find(
            (comment) => comment.type === so.type
          ) as unknown as { attachmentId: string };
          expect(attachment).to.be.ok();
          expect(attachment.attachmentId).to.eql(so.attachmentId);

          const userPartner = updatedCase.comments!.find(
            (comment) => comment.type === 'user' || comment.type === 'comment'
          ) as unknown as { comment?: string; data?: { content?: string } };
          const partnerContent = userPartner.data?.content ?? userPartner.comment;
          expect(partnerContent).to.eql(postCommentUserReq.comment);
        });
      });
    }

    // The comment user-action fires generically for any attachment, so it is
    // asserted once with a representative type rather than per type.
    it('records a comment user-action when a reference SO attachment is created', async () => {
      const [{ type, soType, attachmentId, title }] = REFERENCE_SO_TYPES;
      const postedCase = await createCase(supertest, postCaseReq);
      await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [
          {
            type,
            owner: 'securitySolutionFixture',
            attachmentId,
            metadata: { title, soType },
          },
        ] as unknown as BulkCreateAttachmentsRequestV2,
      });

      const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
      // Position 0 is the "create case" action; position 1 is the attachment.
      const attachmentUserAction = userActions[1];
      expect(attachmentUserAction.type).to.eql('comment');
      expect(attachmentUserAction.action).to.eql('create');
    });
  });
};
