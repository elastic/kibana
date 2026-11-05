/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { toReadableAttackIndexPattern } from '@kbn/elastic-assistant-common';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type {
  AttachmentRequestV2,
  BulkCreateUnifiedAttachmentsRequest,
} from '@kbn/cases-plugin/common/types/api';
import type { UnifiedAttachmentPayload } from '@kbn/cases-plugin/common/types/domain/attachment/v2';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  secOnly,
  secOnlyNoIndexAttacks,
  secOnlyReadAttackAlias,
  superUser,
} from '../../../../common/lib/authentication/users';
import {
  bulkCreateAttachments,
  bulkDeleteAttachmentReferences,
  bulkDeleteAttachments,
  createCase,
  createComment,
  deleteAllCaseItems,
  deleteComment,
  findCaseUserActions,
  getAllComments,
  updateAttachmentV2,
} from '../../../../common/lib/api';
import {
  ALERT_INDEX,
  AD_HOC_ATTACK_INDEX,
  ATTACK_INDEX,
  buildAlertDocument,
  buildAttackDocument,
  deleteAttackDocuments,
  indexAttackDocuments,
} from './attack_documents';

const OWNER = 'securitySolutionFixture';
const ATTACK_ID = 'attack-doc-1';
const AD_HOC_ATTACK_ID = 'ad-hoc-attack-doc-1';
const ALERT_IDS = ['attack-alert-1', 'attack-alert-2'];

// Attack↔alert is many-to-many: an alert can belong to several attacks, and both of those attacks
// can be attached to the same case. The `remove` suite below builds on that.
const ATTACK_A_ID = 'attack-doc-a';
const ATTACK_B_ID = 'attack-doc-b';
const SHARED_ALERT_ID = 'attack-alert-shared';
const ATTACK_A_ONLY_ALERT_ID = 'attack-alert-a-only';
const ATTACK_B_ONLY_ALERT_ID = 'attack-alert-b-only';

/**
 * The metadata snapshot the Attacks page takes at attach time. `title`, `alertCount` and
 * `index` are the required fields; the rest are optional.
 */
const attackMetadata = {
  title: 'Credential harvesting followed by lateral movement',
  summaryMarkdown: 'An adversary harvested credentials and moved laterally.',
  riskScore: 73,
  alertCount: ALERT_IDS.length,
  entityCount: 2,
  index: ATTACK_INDEX,
};

const attackAttachment = {
  type: SECURITY_ATTACK_ATTACHMENT_TYPE,
  owner: OWNER,
  attachmentId: ATTACK_ID,
  metadata: attackMetadata,
};

/**
 * Ad-hoc discoveries live in their own index and carry a rule type the alerting framework never
 * registers, so they are authorized by the caller's Elasticsearch index privileges rather than by
 * alerting RBAC. They are always visible, so there is no privacy to check beyond that.
 */
const adHocAttackMetadata = {
  title: 'Manually generated attack',
  alertCount: 0,
  index: AD_HOC_ATTACK_INDEX,
};

const adHocAttackAttachment = {
  type: SECURITY_ATTACK_ATTACHMENT_TYPE,
  owner: OWNER,
  attachmentId: AD_HOC_ATTACK_ID,
  metadata: adHocAttackMetadata,
};

const alertAttachments = ALERT_IDS.map((alertId) => ({
  type: SECURITY_ALERT_ATTACHMENT_TYPE,
  owner: OWNER,
  attachmentId: alertId,
  metadata: {
    index: ALERT_INDEX,
    rule: { id: 'attack-rule-id', name: 'attack rule' },
  },
}));

/**
 * `security.alert` attachments are batched, so a single id or index posted as a scalar reads
 * back inside an array. Normalise both before asserting.
 */
const toArray = (value: string | string[] | undefined): string[] => {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('Attack attachments', () => {
    beforeEach(async () => {
      // The attack reference is validated before the attachment is persisted, so every attack
      // these tests attach has to exist as an authorized attack discovery in this space.
      await indexAttackDocuments({
        es,
        attackIds: [ATTACK_ID, ATTACK_A_ID, ATTACK_B_ID],
        adHocAttackIds: [AD_HOC_ATTACK_ID],
        alertIds: [...ALERT_IDS, SHARED_ALERT_ID, ATTACK_A_ONLY_ALERT_ID, ATTACK_B_ONLY_ALERT_ID],
      });
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await deleteAttackDocuments(es);
    });

    describe('create', () => {
      it('persists the attack and its constituent alerts, and returns both', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            attackAttachment,
            ...alertAttachments,
          ] as unknown as BulkCreateUnifiedAttachmentsRequest,
        });

        expect(updatedCase.comments?.length).to.be(1 + ALERT_IDS.length);

        const attack = updatedCase.comments!.find(
          (comment) => comment.type === SECURITY_ATTACK_ATTACHMENT_TYPE
        ) as unknown as {
          id: string;
          attachmentId: string;
          owner: string;
          metadata: typeof attackMetadata;
        };
        expect(attack).to.be.ok();
        expect(attack.attachmentId).to.eql(ATTACK_ID);
        expect(attack.owner).to.eql(OWNER);
        // Every metadata field round-trips verbatim: it is stored in `_source` and returned
        // as-is, so the activity card can render without a follow-up query.
        expect(attack.metadata).to.eql(attackMetadata);

        const alerts = updatedCase.comments!.filter(
          (comment) => comment.type === SECURITY_ALERT_ATTACHMENT_TYPE
        ) as unknown as Array<{
          attachmentId: string | string[];
          metadata: { index: string | string[] };
        }>;
        // `security.alert` batches its ids, so an attachment reads back with an array id even
        // when it was posted with a single one.
        expect(alerts.flatMap(({ attachmentId }) => toArray(attachmentId)).sort()).to.eql(
          [...ALERT_IDS].sort()
        );
        for (const alert of alerts) {
          // `metadata.index` is batched alongside the ids, so it reads back as an array too.
          expect(toArray(alert.metadata.index)).to.eql([ALERT_INDEX]);
        }

        // Both attachment kinds land in the unified `cases-attachments` saved object.
        await es.indices.refresh({ index: ALERTING_CASES_SAVED_OBJECT_INDEX });
        const persisted = await es.search<{
          'cases-attachments': { type: string };
        }>({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          size: 100,
          query: { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
        });
        const persistedTypes = persisted.hits.hits
          .map((hit) => hit._source?.[CASE_ATTACHMENT_SAVED_OBJECT].type)
          .filter((type): type is string => type != null)
          .sort();
        expect(persistedTypes).to.eql(
          [
            SECURITY_ATTACK_ATTACHMENT_TYPE,
            ...ALERT_IDS.map(() => SECURITY_ALERT_ATTACHMENT_TYPE),
          ].sort()
        );

        // ...and both come back on a fresh read of the case's attachments. That read projects a
        // unified attachment back to its legacy shape where one exists, so `security.alert` arrives
        // as a legacy `alert` attachment carrying `alertId`; `security.attack` has no legacy
        // equivalent and keeps its unified shape.
        const comments = (await getAllComments({
          supertest,
          caseId: postedCase.id,
        })) as unknown as Array<{
          type: string;
          attachmentId?: string | string[];
          alertId?: string | string[];
        }>;
        expect(comments.length).to.be(1 + ALERT_IDS.length);
        expect(
          comments.find((comment) => comment.type === SECURITY_ATTACK_ATTACHMENT_TYPE)?.attachmentId
        ).to.eql(ATTACK_ID);
        expect(
          comments
            .filter((comment) => comment.type !== SECURITY_ATTACK_ATTACHMENT_TYPE)
            .flatMap((comment) => toArray(comment.alertId ?? comment.attachmentId))
            .sort()
        ).to.eql([...ALERT_IDS].sort());
      });

      it('persists an ad-hoc attack', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

        const updatedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: adHocAttackAttachment as unknown as AttachmentRequestV2,
        });

        const attack = updatedCase.comments!.find(
          (comment) => comment.type === SECURITY_ATTACK_ATTACHMENT_TYPE
        ) as unknown as { attachmentId: string; metadata: typeof adHocAttackMetadata };
        expect(attack).to.be.ok();
        expect(attack.attachmentId).to.eql(AD_HOC_ATTACK_ID);
        expect(attack.metadata.index).to.eql(AD_HOC_ATTACK_INDEX);
      });
    });

    describe('remove', () => {
      const attackAlertIds = {
        [ATTACK_A_ID]: [SHARED_ALERT_ID, ATTACK_A_ONLY_ALERT_ID],
        [ATTACK_B_ID]: [SHARED_ALERT_ID, ATTACK_B_ONLY_ALERT_ID],
      };

      const buildAttackAttachment = (attachmentId: string, alertIds: string[], index: string) => ({
        type: SECURITY_ATTACK_ATTACHMENT_TYPE,
        owner: OWNER,
        attachmentId,
        metadata: { ...attackMetadata, alertCount: alertIds.length, index },
      });

      /**
       * The alert attachment `buildAttacksAttachments` posts right after each attack: one per
       * attack, holding every alert of that attack and naming it as the source.
       */
      const buildAlertAttachment = (alertIds: string[], sourceAttackId: string) => ({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        owner: OWNER,
        attachmentId: alertIds,
        metadata: {
          index: ALERT_INDEX,
          rule: { id: 'attack-rule-id', name: 'attack rule' },
          sourceAttachmentIds: [sourceAttackId],
        },
      });

      interface Attachment {
        id: string;
        type: string;
        attachmentId?: string | string[];
        alertId?: string | string[];
      }

      /**
       * `security.alert` attachments are persisted as plain `alert` attachments, so a list read
       * back from the case reports them under the V1 type while a bulk-create response echoes the
       * V2 type. Accept either so the helpers below work on both.
       */
      const isAlertAttachment = ({ type }: Attachment): boolean =>
        type === SECURITY_ALERT_ATTACHMENT_TYPE || type === AttachmentType.alert;

      /**
       * Attaches A and then B the way the UI does. Cases drops the alert ids already on the case or
       * earlier in the request, so the shared alert stays in A's attachment and B's holds only its
       * own: `[shared, a-only]` and `[b-only]`.
       */
      const seedCaseWithTwoAttacks = async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            buildAttackAttachment(ATTACK_A_ID, attackAlertIds[ATTACK_A_ID], ATTACK_INDEX),
            buildAlertAttachment(attackAlertIds[ATTACK_A_ID], ATTACK_A_ID),
            buildAttackAttachment(ATTACK_B_ID, attackAlertIds[ATTACK_B_ID], ATTACK_INDEX),
            buildAlertAttachment(attackAlertIds[ATTACK_B_ID], ATTACK_B_ID),
          ] as unknown as BulkCreateUnifiedAttachmentsRequest,
        });

        const attachments = updatedCase.comments as unknown as Attachment[];
        const attackAttachmentId = (attackId: string) =>
          attachments.find(
            (attachment) =>
              attachment.type === SECURITY_ATTACK_ATTACHMENT_TYPE &&
              attachment.attachmentId === attackId
          )!.id;

        return { caseId: postedCase.id, attachments, attackAttachmentId };
      };

      const readAttachments = async (caseId: string): Promise<Attachment[]> =>
        (await getAllComments({ supertest, caseId })) as unknown as Attachment[];

      const alertIdsOf = (attachments: Attachment[]): string[] =>
        attachments
          .filter(({ type }) => type !== SECURITY_ATTACK_ATTACHMENT_TYPE)
          .flatMap(({ alertId, attachmentId }) => toArray(alertId ?? attachmentId))
          .sort();

      const attackIdsOf = (attachments: Attachment[]): Array<string | string[] | undefined> =>
        attachments
          .filter(({ type }) => type === SECURITY_ATTACK_ATTACHMENT_TYPE)
          .map(({ attachmentId }) => attachmentId);

      // The removal reads each attack's own alert ids, which the suite-wide fixture omits. Seeding
      // them on the real fixture index matters: an attack outside the attack discovery families is
      // refused at attach time, so a bespoke index would never reach the removal at all.
      beforeEach(async () => {
        await indexAttackDocuments({
          es,
          attackIds: [ATTACK_A_ID, ATTACK_B_ID],
          alertIdsByAttackId: attackAlertIds,
        });
      });

      it('keeps the shared alert in the attachment of the attack attached first', async () => {
        // Every test below depends on this shape; without it removing A would be trivially right.
        const { attachments } = await seedCaseWithTwoAttacks();

        const alertSets = attachments
          .filter(isAlertAttachment)
          .map(({ alertId, attachmentId }) =>
            toArray(alertId ?? attachmentId)
              .sort()
              .join(',')
          )
          .sort();

        expect(alertSets).to.eql(
          [
            [ATTACK_A_ONLY_ALERT_ID, SHARED_ALERT_ID].sort().join(','),
            ATTACK_B_ONLY_ALERT_ID,
          ].sort()
        );
      });

      it('takes the alerts only the first-attached attack claims, keeping the one it shares', async () => {
        const { caseId, attackAttachmentId } = await seedCaseWithTwoAttacks();

        await bulkDeleteAttachments({
          supertest,
          caseId,
          savedObjectIds: [attackAttachmentId(ATTACK_A_ID)],
        });

        const remaining = await readAttachments(caseId);
        expect(attackIdsOf(remaining)).to.eql([ATTACK_B_ID]);
        expect(alertIdsOf(remaining)).to.eql([SHARED_ALERT_ID, ATTACK_B_ONLY_ALERT_ID].sort());
      });

      it('takes the alerts only the second-attached attack claims', async () => {
        const { caseId, attackAttachmentId } = await seedCaseWithTwoAttacks();

        await bulkDeleteAttachments({
          supertest,
          caseId,
          savedObjectIds: [attackAttachmentId(ATTACK_B_ID)],
        });

        const remaining = await readAttachments(caseId);
        expect(attackIdsOf(remaining)).to.eql([ATTACK_A_ID]);
        expect(alertIdsOf(remaining)).to.eql([SHARED_ALERT_ID, ATTACK_A_ONLY_ALERT_ID].sort());
      });

      it('takes the alerts when the attack is removed by its attack id', async () => {
        const { caseId } = await seedCaseWithTwoAttacks();

        await bulkDeleteAttachmentReferences({
          supertest,
          caseId,
          type: SECURITY_ATTACK_ATTACHMENT_TYPE,
          attachmentIds: [ATTACK_A_ID],
        });

        const remaining = await readAttachments(caseId);
        expect(attackIdsOf(remaining)).to.eql([ATTACK_B_ID]);
        expect(alertIdsOf(remaining)).to.eql([SHARED_ALERT_ID, ATTACK_B_ONLY_ALERT_ID].sort());
      });

      it('keeps every alert when the attack is removed by its attack id without related attachments', async () => {
        const { caseId } = await seedCaseWithTwoAttacks();

        await bulkDeleteAttachmentReferences({
          supertest,
          caseId,
          type: SECURITY_ATTACK_ATTACHMENT_TYPE,
          attachmentIds: [ATTACK_A_ID],
          includeRelated: false,
        });

        const remaining = await readAttachments(caseId);
        expect(attackIdsOf(remaining)).to.eql([ATTACK_B_ID]);
        expect(alertIdsOf(remaining)).to.eql(
          [SHARED_ALERT_ID, ATTACK_A_ONLY_ALERT_ID, ATTACK_B_ONLY_ALERT_ID].sort()
        );
      });

      it('records 1 activity entry for the attack and 1 for its alerts', async () => {
        const { caseId, attackAttachmentId } = await seedCaseWithTwoAttacks();

        await bulkDeleteAttachments({
          supertest,
          caseId,
          savedObjectIds: [attackAttachmentId(ATTACK_B_ID)],
        });

        const { userActions } = await findCaseUserActions({ supertest, caseID: caseId });
        const deletions = userActions
          .filter(({ type, action }) => type === 'bulkAttachments' && action === 'delete')
          .flatMap(({ payload }) => ('bulkAttachments' in payload ? [payload.bulkAttachments] : []))
          .sort((a, b) => a.attachmentType.localeCompare(b.attachmentType));

        expect(deletions).to.eql([
          { attachmentType: SECURITY_ALERT_ATTACHMENT_TYPE, count: 1 },
          { attachmentType: SECURITY_ATTACK_ATTACHMENT_TYPE, count: 1 },
        ]);
      });

      for (const [first, second] of [
        [ATTACK_A_ID, ATTACK_B_ID],
        [ATTACK_B_ID, ATTACK_A_ID],
      ]) {
        it(`takes every alert once ${first} and then ${second} are removed`, async () => {
          const { caseId, attackAttachmentId } = await seedCaseWithTwoAttacks();

          await bulkDeleteAttachments({
            supertest,
            caseId,
            savedObjectIds: [attackAttachmentId(first)],
          });
          await bulkDeleteAttachments({
            supertest,
            caseId,
            savedObjectIds: [attackAttachmentId(second)],
          });

          expect(await readAttachments(caseId)).to.eql([]);
        });
      }

      it('takes the alerts with the attack when it is deleted through the public delete API', async () => {
        const { caseId, attackAttachmentId } = await seedCaseWithTwoAttacks();

        await deleteComment({ supertest, caseId, commentId: attackAttachmentId(ATTACK_A_ID) });

        const remaining = await readAttachments(caseId);
        expect(attackIdsOf(remaining)).to.eql([ATTACK_B_ID]);
        expect(alertIdsOf(remaining)).to.eql([SHARED_ALERT_ID, ATTACK_B_ONLY_ALERT_ID].sort());
      });

      it('keeps every alert when related attachments are excluded', async () => {
        const { caseId, attackAttachmentId } = await seedCaseWithTwoAttacks();

        await bulkDeleteAttachments({
          supertest,
          caseId,
          savedObjectIds: [attackAttachmentId(ATTACK_A_ID)],
          includeRelated: false,
        });

        const remaining = await readAttachments(caseId);
        expect(attackIdsOf(remaining)).to.eql([ATTACK_B_ID]);
        expect(alertIdsOf(remaining)).to.eql(
          [SHARED_ALERT_ID, ATTACK_A_ONLY_ALERT_ID, ATTACK_B_ONLY_ALERT_ID].sort()
        );
      });

      it('still takes the shared alert with the other attack after related attachments were excluded', async () => {
        const { caseId, attackAttachmentId } = await seedCaseWithTwoAttacks();

        await bulkDeleteAttachments({
          supertest,
          caseId,
          savedObjectIds: [attackAttachmentId(ATTACK_A_ID)],
          includeRelated: false,
        });
        await bulkDeleteAttachments({
          supertest,
          caseId,
          savedObjectIds: [attackAttachmentId(ATTACK_B_ID)],
        });

        // No remaining attack claims the shared alert, so B's removal takes it. A's own alert is
        // not B's to take.
        const remaining = await readAttachments(caseId);
        expect(attackIdsOf(remaining)).to.eql([]);
        expect(alertIdsOf(remaining)).to.eql([ATTACK_A_ONLY_ALERT_ID]);
      });

      it("keeps every alert when another attack's document no longer exists", async () => {
        const { caseId, attackAttachmentId } = await seedCaseWithTwoAttacks();
        await es.delete({ index: ATTACK_INDEX, id: ATTACK_B_ID, refresh: true });

        await bulkDeleteAttachments({
          supertest,
          caseId,
          savedObjectIds: [attackAttachmentId(ATTACK_A_ID)],
        });

        // B's alerts cannot be read, so nothing proves the shared alert is A's alone.
        const remaining = await readAttachments(caseId);
        expect(attackIdsOf(remaining)).to.eql([ATTACK_B_ID]);
        expect(alertIdsOf(remaining)).to.eql(
          [SHARED_ALERT_ID, ATTACK_A_ONLY_ALERT_ID, ATTACK_B_ONLY_ALERT_ID].sort()
        );
      });

      it('deletes nothing when one of the ids is not an attachment of the case', async () => {
        const { caseId, attachments, attackAttachmentId } = await seedCaseWithTwoAttacks();

        await bulkDeleteAttachments({
          supertest,
          caseId,
          savedObjectIds: [attackAttachmentId(ATTACK_A_ID), 'not-an-attachment-of-this-case'],
          expectedHttpCode: 404,
        });

        expect((await readAttachments(caseId)).length).to.be(attachments.length);
      });

      it('keeps an alert the analyst attached before the attack, taking only what the attack added', async () => {
        // The public delete API has no prompt, so `metadata.sourceAttachmentIds` is the only thing
        // separating an alert the attack contributed from an identical one the analyst attached
        // themselves. The analyst's attachment carries none, so it is not the attack's to take.
        const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: SECURITY_ALERT_ATTACHMENT_TYPE,
            owner: OWNER,
            attachmentId: SHARED_ALERT_ID,
            metadata: {
              index: ALERT_INDEX,
              rule: { id: 'attack-rule-id', name: 'attack rule' },
            },
          } as unknown as AttachmentRequestV2,
        });

        // The shared alert is already on the case, so the attack's own attachment holds only A1.
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            buildAttackAttachment(ATTACK_A_ID, attackAlertIds[ATTACK_A_ID], ATTACK_INDEX),
            buildAlertAttachment(attackAlertIds[ATTACK_A_ID], ATTACK_A_ID),
          ] as unknown as BulkCreateUnifiedAttachmentsRequest,
        });

        const seededAttack = (updatedCase.comments as unknown as Attachment[]).find(
          ({ type }) => type === SECURITY_ATTACK_ATTACHMENT_TYPE
        )!;

        await deleteComment({ supertest, caseId: postedCase.id, commentId: seededAttack.id });

        const remaining = await readAttachments(postedCase.id);
        expect(attackIdsOf(remaining)).to.eql([]);
        expect(alertIdsOf(remaining)).to.eql([SHARED_ALERT_ID]);
      });
    });

    describe('schema validation', () => {
      // `metadata.index` is what status sync writes to and, mapped to its readable pattern, what the
      // attack is authorized against; the "already attached" check reads `attachmentId` instead. It
      // is required because, unlike `security.alert`, the attack type has no legacy shape to keep.
      const requiredMetadataFields = ['title', 'alertCount', 'index'] as const;

      for (const field of requiredMetadataFields) {
        it(`rejects an attack attachment missing metadata.${field}`, async () => {
          const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

          const { [field]: _omitted, ...metadata } = attackMetadata;

          const response = (await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              ...attackAttachment,
              metadata,
            } as unknown as AttachmentRequestV2,
            expectedHttpCode: 400,
          })) as unknown as { statusCode: number; error: string; message: string; stack?: string };

          expect(response.statusCode).to.be(400);
          expect(response.error).to.be('Bad Request');
          expect(response.message).to.contain(
            `Invalid attachment payload for type '${SECURITY_ATTACK_ATTACHMENT_TYPE}'`
          );
          expect(response.message).to.contain(`metadata.${field}`);
          // The validator summarises the zod issues; it must not leak the error class or a stack.
          expect(response.message).not.to.contain('ZodError');
          expect(response.stack).to.be(undefined);
        });
      }

      it('rejects an attack attachment carrying an unknown metadata field', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

        const response = (await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            ...attackAttachment,
            metadata: { ...attackMetadata, extraField: 'not-allowed' },
          } as unknown as AttachmentRequestV2,
          expectedHttpCode: 400,
        })) as unknown as { message: string };

        expect(response.message).to.contain(
          `Invalid attachment payload for type '${SECURITY_ATTACK_ATTACHMENT_TYPE}'`
        );
      });
    });

    /**
     * The reference is what the status sync later writes to, by id and index alone, so it has to
     * be an attack discovery the caller is allowed to read in this space before the attachment is
     * persisted. Authorizing it as a plain alert is not enough: the rule-type/consumer check is a
     * no-op for a document that is missing, is not an alert, or lives in another space.
     */
    describe('reference validation', () => {
      const attachAttack = async (
        attachment: Record<string, unknown>
      ): Promise<{ message: string }> => {
        const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

        return (await createComment({
          supertest,
          caseId: postedCase.id,
          params: attachment as unknown as AttachmentRequestV2,
          expectedHttpCode: 400,
        })) as unknown as { message: string };
      };

      it('rejects an attack whose document does not exist', async () => {
        const response = await attachAttack({
          ...attackAttachment,
          attachmentId: 'attack-that-was-never-indexed',
        });

        expect(response.message).to.contain('Referenced attack(s) not found');
      });

      it('rejects an attack whose index is outside the attack discovery index families', async () => {
        // A valid attack document, but in an index that does not hold attack discoveries.
        await es.index({
          index: ALERT_INDEX,
          id: 'attack-in-alerts-index',
          document: buildAttackDocument(),
          refresh: true,
        });

        const response = await attachAttack({
          ...attackAttachment,
          attachmentId: 'attack-in-alerts-index',
          metadata: { ...attackMetadata, index: ALERT_INDEX },
        });

        expect(response.message).to.contain('is not an attack discovery index');
      });

      it('rejects an attack pointing at a document that is not an alert', async () => {
        await es.index({
          index: ATTACK_INDEX,
          id: 'not-an-alert',
          document: { '@timestamp': new Date().toISOString(), message: 'just a document' },
          refresh: true,
        });

        const response = await attachAttack({
          ...attackAttachment,
          attachmentId: 'not-an-alert',
        });

        expect(response.message).to.contain('are not attack discoveries in space default');
      });

      it('rejects an attack pointing at an alert of another rule type', async () => {
        await es.index({
          index: ATTACK_INDEX,
          id: 'detection-alert',
          document: buildAlertDocument(),
          refresh: true,
        });

        const response = await attachAttack({
          ...attackAttachment,
          attachmentId: 'detection-alert',
        });

        expect(response.message).to.contain('are not attack discoveries in space default');
      });

      it('rejects an attack belonging to another space', async () => {
        await es.index({
          index: ATTACK_INDEX,
          id: 'attack-in-space-2',
          document: buildAttackDocument('space-2'),
          refresh: true,
        });

        const response = await attachAttack({
          ...attackAttachment,
          attachmentId: 'attack-in-space-2',
        });

        expect(response.message).to.contain('are not attack discoveries in space default');
      });

      it('rejects replacing the reference of an existing attack attachment with an unknown document', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

        const withAttack = await createComment({
          supertest,
          caseId: postedCase.id,
          params: attackAttachment as unknown as AttachmentRequestV2,
        });

        const attachment = withAttack.comments!.find(
          (comment) => comment.type === SECURITY_ATTACK_ATTACHMENT_TYPE
        ) as unknown as { id: string; version: string };

        const response = (await updateAttachmentV2({
          supertest,
          caseId: postedCase.id,
          attachmentId: attachment.id,
          req: {
            version: attachment.version,
            ...attackAttachment,
            attachmentId: 'attack-that-was-never-indexed',
          } as unknown as UnifiedAttachmentPayload & { version: string },
          expectedHttpCode: 400,
        })) as unknown as { message: string };

        expect(response.message).to.contain('Referenced attack(s) not found');

        // Nothing was written: the attachment still points at the attack it was created with.
        const comments = (await getAllComments({
          supertest,
          caseId: postedCase.id,
        })) as unknown as Array<{ type: string; attachmentId?: string }>;
        expect(
          comments.find((comment) => comment.type === SECURITY_ATTACK_ATTACHMENT_TYPE)?.attachmentId
        ).to.eql(ATTACK_ID);
      });

      it('rejects an attack from a user without read access to attack discoveries', async () => {
        // `sec_only_all` holds every cases privilege but none of the attack discovery ones, so the
        // attachment is refused by the alerting RBAC check, not by a cases privilege.
        await indexAttackDocuments({ es, attackIds: [ATTACK_ID], spaceId: 'space1' });

        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: OWNER }),
          200,
          { user: superUser, space: 'space1' }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: attackAttachment as unknown as AttachmentRequestV2,
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 403,
        });

        expect(
          await getAllComments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user: superUser, space: 'space1' },
          })
        ).to.eql([]);
      });
    });

    /**
     * An attachment carries the backing index, but roles are granted read on the alias in front of
     * it, never on the backing index. The reference is therefore authorized by reading it, as the
     * caller, through the pattern `toReadableAttackIndexPattern` maps the backing index to.
     */
    describe('index privileges', () => {
      // Status sync also writes to `metadata.index` as the caller; it is off so that these tests
      // assert on the authorization read alone.
      const postCaseRequest = getPostCaseRequest({
        owner: OWNER,
        settings: { syncAlerts: false, extractObservables: false },
      });

      beforeEach(async () => {
        await indexAttackDocuments({ es, attackIds: [ATTACK_ID], spaceId: 'space1' });
      });

      it('attaches an attack for a user who can read the alias but not the backing index', async () => {
        // Without the rewrite this would only cover the pass-through branch.
        expect(toReadableAttackIndexPattern(ATTACK_INDEX)).not.to.be(ATTACK_INDEX);

        const postedCase = await createCase(supertestWithoutAuth, postCaseRequest, 200, {
          user: superUser,
          space: 'space1',
        });

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: attackAttachment as unknown as AttachmentRequestV2,
          auth: { user: secOnlyReadAttackAlias, space: 'space1' },
        });

        const comments = (await getAllComments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: secOnlyReadAttackAlias, space: 'space1' },
        })) as unknown as Array<{
          type: string;
          attachmentId?: string;
          metadata?: { index?: string };
        }>;
        expect(comments.length).to.be(1);
        expect(comments[0].type).to.eql(SECURITY_ATTACK_ATTACHMENT_TYPE);
        expect(comments[0].attachmentId).to.eql(ATTACK_ID);
        // Only the authorization read is rewritten; the attachment keeps the index it was given.
        expect(comments[0].metadata?.index).to.eql(ATTACK_INDEX);
      });

      it('takes the attack alerts for a user who can read the alias but not the backing index', async () => {
        // The removal resolves the attack's alerts as the requesting user. Reading the
        // snapshotted backing index would be refused for this role and the alerts would be
        // silently stranded on the case, so the readable pattern has to be used there too.
        const alertId = 'attack-alias-removal-alert';
        await indexAttackDocuments({
          es,
          attackIds: [ATTACK_ID],
          alertIds: [alertId],
          alertIdsByAttackId: { [ATTACK_ID]: [alertId] },
          spaceId: 'space1',
        });

        const postedCase = await createCase(supertestWithoutAuth, postCaseRequest, 200, {
          user: superUser,
          space: 'space1',
        });

        const updatedCase = await bulkCreateAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: [
            attackAttachment,
            {
              type: SECURITY_ALERT_ATTACHMENT_TYPE,
              owner: OWNER,
              attachmentId: alertId,
              metadata: {
                index: ALERT_INDEX,
                rule: { id: 'attack-rule-id', name: 'attack rule' },
                // Without the provenance the removal would keep the alert whatever the alias
                // read did, and this would stop exercising the authorization path it is about.
                sourceAttachmentIds: [ATTACK_ID],
              },
            },
          ] as unknown as BulkCreateUnifiedAttachmentsRequest,
          auth: { user: superUser, space: 'space1' },
        });

        const attackAttachmentId = updatedCase.comments!.find(
          (comment) => comment.type === SECURITY_ATTACK_ATTACHMENT_TYPE
        )!.id;

        await deleteComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          commentId: attackAttachmentId,
          auth: { user: secOnlyReadAttackAlias, space: 'space1' },
        });

        expect(
          await getAllComments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user: superUser, space: 'space1' },
          })
        ).to.eql([]);
      });

      it('rejects an attack from a user with the same privileges but no read on the alias', async () => {
        const postedCase = await createCase(supertestWithoutAuth, postCaseRequest, 200, {
          user: superUser,
          space: 'space1',
        });

        const response = (await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: attackAttachment as unknown as AttachmentRequestV2,
          auth: { user: secOnlyNoIndexAttacks, space: 'space1' },
          expectedHttpCode: 400,
        })) as unknown as { message: string };

        // The pattern resolves to nothing this user can read, so the attack is not found rather
        // than forbidden.
        expect(response.message).to.contain('Referenced attack(s) not found');

        expect(
          await getAllComments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user: superUser, space: 'space1' },
          })
        ).to.eql([]);
      });
    });
  });
};
