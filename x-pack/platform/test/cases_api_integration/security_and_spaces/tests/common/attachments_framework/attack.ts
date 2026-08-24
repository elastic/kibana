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
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  createCase,
  createComment,
  deleteAllCaseItems,
  getAllComments,
} from '../../../../common/lib/api';

const OWNER = 'securitySolutionFixture';
const ATTACK_ID = 'attack-doc-1';
const ATTACK_INDEX = '.alerts-security.attack.discovery.alerts-default';
const ALERT_INDEX = '.alerts-security.alerts-default';
const ALERT_IDS = ['attack-alert-1', 'attack-alert-2'];

/**
 * The metadata snapshot the Attacks page takes at attach time. `title`, `alertCount` and
 * `index` are the required fields; the rest are optional because metadata is stored in
 * `_source` but never indexed, so fields added in a later release cannot be backfilled.
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

/** `security.alert` attachment ids read back as an array even when posted as a single id. */
const toIds = (attachmentId: string | string[] | undefined): string[] => {
  if (attachmentId == null) {
    return [];
  }
  return Array.isArray(attachmentId) ? attachmentId : [attachmentId];
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Attack attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
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
        ) as unknown as Array<{ attachmentId: string | string[]; metadata: { index: string } }>;
        // `security.alert` batches its ids, so an attachment reads back with an array id even
        // when it was posted with a single one.
        expect(alerts.flatMap(({ attachmentId }) => toIds(attachmentId)).sort()).to.eql(
          [...ALERT_IDS].sort()
        );
        for (const alert of alerts) {
          expect(alert.metadata.index).to.eql(ALERT_INDEX);
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
            .flatMap((comment) => toIds(comment.alertId ?? comment.attachmentId))
            .sort()
        ).to.eql([...ALERT_IDS].sort());
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
  });
};
