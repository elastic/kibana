/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  deleteCases,
  deleteComment,
  getAuthWithSuperUser,
  updateComment,
} from '../../../../common/lib/api';
import {
  ATTACHMENTS_INDEX,
  CASE_INDEX,
  getV2State,
  resetV2,
  waitForAttachmentForCase,
  waitForAttachmentsAbsent,
} from './helpers';

/**
 * End-to-end coverage of the attachments surface:
 *
 *     attachment SO mutation → AttachmentService hook
 *       → CasesAttachmentsV2Writer → .cases-attachments
 *
 * The integration FTR config doesn't enable
 * `xpack.cases.attachments.enabled`, so the AttachmentService writes
 * to the LEGACY `cases-comments` SO type. The doc-builder normalizes
 * both legacy and unified shapes into the same analytics doc — the
 * legacy → unified mapping is exercised here via the live write path,
 * and the unified-source path is exercised by the schema-drift unit
 * tests in `mappings/attachments_schema_drift.test.ts` (fixtures cover
 * both source SO shapes per subtype).
 *
 * Tests assert:
 *   1. `createComment` (user subtype) lands in `.cases-attachments`
 *      with the unified curated extracts populated.
 *   2. `updateComment` produces an updated analytics doc.
 *   3. `deleteComment` drops the analytics doc via the writer's
 *      per-id delete path.
 *   4. `deleteCase` cascades the analytics docs out (verifies
 *      `bulkDeleteAttachmentsByCaseIds` from `CasesService`).
 *   5. `/state` reports the attachments surface independently.
 *   6. `/reset` rebuilds all three surfaces.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const auth = getAuthWithSuperUser();

  // The analytics doc records the UNIFIED attachment type, not the legacy
  // `AttachmentType` domain enum used on the SO / API. A legacy `user`
  // comment normalizes to unified type `'comment'` (see the
  // `services/attachments` `toUnifiedSchema`), so the `.cases-attachments`
  // doc's `attachment.type` is `'comment'` — not `AttachmentType.user`.
  const UNIFIED_COMMENT_TYPE = 'comment';

  describe('attachments surface ES round-trip', () => {
    afterEach(async () => {
      // Clean SOs first, then reset all surfaces — the post-reset
      // reconciliation walk has nothing to find that way.
      await deleteAllCaseItems(es);
      await resetV2(supertest);
    });

    it('createComment (user) → attachment doc lands in .cases-attachments with curated extracts', async () => {
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      const withComment = await createComment({
        supertest: supertestWithoutAuth,
        caseId: created.id,
        params: postCommentUserReq,
        auth,
      });
      // The created case's attachments are returned on the wrapping
      // case object; pluck the comment id off it.
      const commentId = withComment.comments?.[0]?.id;
      expect(commentId).to.be.a('string');

      const docs = await waitForAttachmentForCase(es, created.id, 1);
      const userDoc = docs.find((d) => d.attachment.type === UNIFIED_COMMENT_TYPE);
      expect(userDoc).to.be.an('object');
      expect(userDoc!.cases.id).to.eql(created.id);
      // The suite creates every case in `space1` (see `getAuthWithSuperUser`),
      // so the analytics doc's `space_id` — derived from the SO namespaces —
      // is `space1`, not the default space.
      expect(userDoc!.space_id).to.eql(auth.space);
      // Curated extract: the user comment text round-trips via the
      // legacy → unified normalization (legacy `comment` field →
      // `data.content` → `attachment.comment` extract).
      expect(userDoc!.attachment.comment).to.be.a('string');
      expect(userDoc!.attachment.comment).to.eql(postCommentUserReq.comment);
      // Owner pass-through.
      expect(userDoc!.owner).to.eql(postCommentUserReq.owner);
    });

    it('updateComment → analytics doc reflects the patch', async () => {
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      const withComment = await createComment({
        supertest: supertestWithoutAuth,
        caseId: created.id,
        params: postCommentUserReq,
        auth,
      });
      const comment = withComment.comments?.[0];
      expect(comment).to.be.an('object');
      await waitForAttachmentForCase(es, created.id, 1);

      await updateComment({
        supertest: supertestWithoutAuth,
        caseId: created.id,
        req: {
          id: comment!.id,
          version: comment!.version,
          type: AttachmentType.user,
          owner: postCommentUserReq.owner,
          comment: 'Updated comment text',
        },
        auth,
      });

      // Poll until the analytics doc reflects the new content.
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        await es.indices.refresh({ index: ATTACHMENTS_INDEX });
        const docs = await waitForAttachmentForCase(es, created.id, 1);
        const userDoc = docs.find((d) => d.attachment.type === UNIFIED_COMMENT_TYPE);
        if (userDoc?.attachment.comment === 'Updated comment text') return;
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error('Timed out waiting for the analytics doc to reflect the patched comment');
    });

    it('deleteComment → analytics doc removed via the writer per-id delete path', async () => {
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      const withComment = await createComment({
        supertest: supertestWithoutAuth,
        caseId: created.id,
        params: postCommentUserReq,
        auth,
      });
      const comment = withComment.comments?.[0];
      await waitForAttachmentForCase(es, created.id, 1);

      await deleteComment({
        supertest: supertestWithoutAuth,
        caseId: created.id,
        commentId: comment!.id,
        auth,
      });

      await waitForAttachmentsAbsent(es, created.id);
    });

    it('deleteCase → cascade-deletes every attachment doc for that case', async () => {
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      // Add two attachments so the cascade-delete has more than one
      // analytics doc to drop.
      await createComment({
        supertest: supertestWithoutAuth,
        caseId: created.id,
        params: postCommentUserReq,
        auth,
      });
      await createComment({
        supertest: supertestWithoutAuth,
        caseId: created.id,
        params: { ...postCommentUserReq, comment: 'Second comment' },
        auth,
      });
      await waitForAttachmentForCase(es, created.id, 2);

      // Delete must be scoped to `space1` (where the case lives) via `auth`;
      // an unscoped delete hits the default space and 404s.
      await deleteCases({
        supertest: supertestWithoutAuth,
        caseIDs: [created.id],
        auth,
      });

      await waitForAttachmentsAbsent(es, created.id);
    });

    it('/state reports the attachments surface independently of cases + activity', async () => {
      const state = await getV2State(supertest);
      expect(state.enabled).to.be(true);
      expect(state.surfaces.cases.index).to.eql(CASE_INDEX);
      expect(state.surfaces.cases.index_exists).to.be(true);
      expect(state.surfaces.attachments.index).to.eql(ATTACHMENTS_INDEX);
      expect(state.surfaces.attachments.index_exists).to.be(true);
    });

    it('/reset rebuilds the attachments surface and reconciliation re-emits existing rows', async () => {
      const created = await createCase(supertestWithoutAuth, getPostCaseRequest(), 200, auth);
      await createComment({
        supertest: supertestWithoutAuth,
        caseId: created.id,
        params: postCommentUserReq,
        auth,
      });
      await waitForAttachmentForCase(es, created.id, 1);

      // `/reset` returns 202 + drops + recreates all three indices,
      // then schedules the backfill task. `resetV2` waits for the
      // task SO to disappear (success).
      await resetV2(supertest);

      // After the backfill task completes, the attachments index is
      // rebuilt and the comment SO (still on disk) is re-emitted.
      await waitForAttachmentForCase(es, created.id, 1);
    });
  });
};
