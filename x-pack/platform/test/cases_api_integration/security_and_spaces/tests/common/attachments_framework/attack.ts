/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type {
  AttachmentRequestV2,
  BulkCreateAttachmentsRequestV2,
} from '@kbn/cases-plugin/common/types/api';
import type { UnifiedAttachmentPayload } from '@kbn/cases-plugin/common/types/domain/attachment/v2';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { secOnly, superUser } from '../../../../common/lib/authentication/users';
import {
  bulkCreateAttachments,
  bulkDeleteAttachments,
  createCase,
  createComment,
  deleteAllCaseItems,
  getAllComments,
  updateAttachmentV2,
} from '../../../../common/lib/api';
import {
  ALERT_INDEX,
  ATTACK_INDEX,
  buildAlertDocument,
  buildAttackDocument,
  deleteAttackDocuments,
  indexAttackDocuments,
} from './attack_documents';

const OWNER = 'securitySolutionFixture';
const ATTACK_ID = 'attack-doc-1';
const ALERT_IDS = ['attack-alert-1', 'attack-alert-2'];

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
        attackIds: [ATTACK_ID],
        alertIds: [...ALERT_IDS],
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
          ] as unknown as BulkCreateAttachmentsRequestV2,
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
    });

    describe('remove', () => {
      it('bulk deletes an attack attachment', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [attackAttachment] as unknown as BulkCreateAttachmentsRequestV2,
        });

        const attachments = updatedCase.comments as unknown as Array<{ id: string }>;
        expect(attachments.length).to.be(1);

        await bulkDeleteAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: [attachments[0].id],
        });

        expect(await getAllComments({ supertest, caseId: postedCase.id })).to.eql([]);
      });
    });

    describe('schema validation', () => {
      // `metadata.index` is what the Cases platform reads for the "already attached" duplicate
      // check and what status sync writes to, so it is required — unlike `security.alert`, the
      // attack type has no legacy shape to stay compatible with.
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
  });
};
