/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
  SECURITY_ENTITY_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type {
  AttachmentRequestV2,
  BulkCreateUnifiedAttachmentsRequest,
} from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest, postCommentEntityReq } from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  bulkDeleteAttachments,
  createCase,
  createComment,
  deleteAllCaseItems,
  getAllComments,
} from '../../../../common/lib/api';
import {
  ALERT_INDEX,
  ATTACK_INDEX,
  deleteAttackDocuments,
  indexAttackDocuments,
} from '../attachments_framework/attack_documents';

const OWNER = 'securitySolutionFixture';

const attackAttachment = {
  type: SECURITY_ATTACK_ATTACHMENT_TYPE,
  owner: OWNER,
  attachmentId: 'attack-doc-1',
  metadata: {
    title: 'Credential harvesting followed by lateral movement',
    alertCount: 2,
    index: '.alerts-security.attack.discovery.alerts-default',
  },
};

const SEEDED_ATTACK_ID = 'attack-doc-seeded';
const SEEDED_ALERT_IDS = ['attack-alert-seeded-1', 'attack-alert-seeded-2'];

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  /** Writes an attack attachment straight to the index, since the attach route refuses it. */
  const seedAttackAttachment = async (caseId: string): Promise<string> => {
    const id = 'seeded-attack-attachment';
    await es.index({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${id}`,
      refresh: 'wait_for',
      document: {
        type: CASE_ATTACHMENT_SAVED_OBJECT,
        [CASE_ATTACHMENT_SAVED_OBJECT]: {
          ...attackAttachment,
          attachmentId: SEEDED_ATTACK_ID,
          metadata: {
            ...attackAttachment.metadata,
            alertCount: SEEDED_ALERT_IDS.length,
            index: ATTACK_INDEX,
          },
          created_at: '2024-01-01T00:00:00.000Z',
          created_by: { username: 'elastic', full_name: null, email: null },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
        references: [{ type: CASE_SAVED_OBJECT, id: caseId, name: 'associated-cases' }],
        namespaces: ['default'],
        updated_at: '2024-01-01T00:00:00.000Z',
        coreMigrationVersion: '8.8.0',
      },
    });

    return id;
  };

  describe('Attack attachments — attackAttachments OFF', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
      await deleteAttackDocuments(es);
    });

    it('rejects a security.attack attachment while the flag gates the attach path', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

      const response = (await createComment({
        supertest,
        caseId: postedCase.id,
        params: attackAttachment as unknown as AttachmentRequestV2,
        expectedHttpCode: 400,
      })) as unknown as { statusCode: number; error: string; message: string };

      expect(response.statusCode).to.be(400);
      expect(response.error).to.be('Bad Request');
      expect(response.message).to.contain(
        `Invalid attachment payload for type '${SECURITY_ATTACK_ATTACHMENT_TYPE}'`
      );
      expect(response.message).to.contain('attackAttachments');

      const comments = await getAllComments({ supertest, caseId: postedCase.id });
      expect(comments.length).to.be(0);
    });

    it('rejects a bulk batch containing a security.attack attachment without persisting any of it', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

      await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [
          postCommentEntityReq,
          attackAttachment,
        ] as unknown as BulkCreateUnifiedAttachmentsRequest,
        expectedHttpCode: 400,
      });

      const comments = await getAllComments({ supertest, caseId: postedCase.id });
      expect(comments.length).to.be(0);
    });

    it('takes the alerts with an attack attached while the flag was on', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));
      await indexAttackDocuments({
        es,
        attackIds: [SEEDED_ATTACK_ID],
        alertIds: SEEDED_ALERT_IDS,
        alertIdsByAttackId: { [SEEDED_ATTACK_ID]: SEEDED_ALERT_IDS },
      });
      const attackAttachmentId = await seedAttackAttachment(postedCase.id);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: {
          type: SECURITY_ALERT_ATTACHMENT_TYPE,
          owner: OWNER,
          attachmentId: SEEDED_ALERT_IDS,
          metadata: {
            index: ALERT_INDEX,
            rule: { id: 'attack-rule-id', name: 'attack rule' },
            sourceAttachmentIds: [SEEDED_ATTACK_ID],
          },
        } as unknown as AttachmentRequestV2,
      });

      await bulkDeleteAttachments({
        supertest,
        caseId: postedCase.id,
        savedObjectIds: [attackAttachmentId],
      });

      const comments = await getAllComments({ supertest, caseId: postedCase.id });
      expect(comments.length).to.be(0);
    });

    it('still accepts other unified attachment types', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest({ owner: OWNER }));

      const updatedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentEntityReq as unknown as AttachmentRequestV2,
      });

      expect(updatedCase.comments?.length).to.be(1);
      expect(updatedCase.comments![0].type).to.eql(SECURITY_ENTITY_ATTACHMENT_TYPE);
    });
  });
};
