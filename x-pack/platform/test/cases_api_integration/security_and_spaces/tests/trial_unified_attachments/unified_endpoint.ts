/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type { AttachmentRequest } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { postCaseReq, postCommentActionsReq } from '../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  deleteComment,
  getComment,
} from '../../../common/lib/api';

const OWNER = 'securitySolutionFixture';

const unifiedTargets = [
  { endpointId: 'endpoint-1', hostname: 'host-1', agentType: 'endpoint' as const },
];

const unifiedMetadata = {
  command: 'isolate',
  targets: unifiedTargets,
};

const unifiedData = { content: 'Isolated host because of suspicious activity' };

const unifiedEndpointPayload = (overrides: Record<string, unknown> = {}) =>
  ({
    type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
    attachmentId: 'unified-endpoint-1',
    owner: OWNER,
    data: unifiedData,
    metadata: unifiedMetadata,
    ...overrides,
  } as unknown as AttachmentRequest);

const legacyExternalReferencePayload = (overrides: Record<string, unknown> = {}) =>
  ({
    type: 'externalReference',
    externalReferenceId: 'legacy-er-endpoint-1',
    externalReferenceStorage: { type: 'elasticSearchDoc' },
    externalReferenceAttachmentTypeId: 'endpoint',
    externalReferenceMetadata: {
      ...unifiedMetadata,
      comment: unifiedData.content,
    },
    owner: OWNER,
    ...overrides,
  } as unknown as AttachmentRequest);

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const searchSO = (soType: string, soId: string) =>
    es.search({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      query: {
        bool: {
          must: [{ term: { type: soType } }, { term: { _id: `${soType}:${soId}` } }],
        },
      },
    });

  describe('Unified Endpoint — CRUD with flag ON', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('create', () => {
      it('writes a unified `security.endpoint` payload to cases-attachments (flag ON)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedEndpointPayload(),
        });

        const attachmentId = patched.comments![0].id;

        const unifiedSOs = await searchSO(CASE_ATTACHMENT_SAVED_OBJECT, attachmentId);
        expect(unifiedSOs.hits.hits.length).to.be(1);

        const unifiedSO = unifiedSOs.hits.hits[0]._source as {
          'cases-attachments': {
            type: string;
            attachmentId: string;
            data?: { content?: string };
            metadata?: { command?: string; targets?: unknown[]; comment?: unknown };
          };
        };
        expect(unifiedSO['cases-attachments'].type).to.be(SECURITY_ENDPOINT_ATTACHMENT_TYPE);
        expect(unifiedSO['cases-attachments'].attachmentId).to.be('unified-endpoint-1');
        expect(unifiedSO['cases-attachments'].data?.content).to.be(unifiedData.content);
        expect(unifiedSO['cases-attachments'].metadata?.command).to.be('isolate');
        expect(unifiedSO['cases-attachments'].metadata?.targets).to.eql(unifiedTargets);
        expect(unifiedSO['cases-attachments'].metadata).not.to.have.property('comment');

        const legacySOs = await searchSO(CASE_COMMENT_SAVED_OBJECT, attachmentId);
        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('accepts a legacy `externalReference + endpoint` payload and stores it as a unified `security.endpoint` row (server lifts comment → data.content)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyExternalReferencePayload(),
        });

        // API projection always returns the legacy externalReference shape.
        const fileComment = patched.comments![0];
        expect(fileComment.type).to.be(AttachmentType.externalReference);

        const unifiedSOs = await searchSO(CASE_ATTACHMENT_SAVED_OBJECT, fileComment.id);
        expect(unifiedSOs.hits.hits.length).to.be(1);

        const unifiedSO = unifiedSOs.hits.hits[0]._source as {
          'cases-attachments': {
            type: string;
            attachmentId: string;
            data?: { content?: string };
            metadata?: { command?: string; targets?: unknown[]; comment?: unknown };
          };
        };
        expect(unifiedSO['cases-attachments'].type).to.be(SECURITY_ENDPOINT_ATTACHMENT_TYPE);
        expect(unifiedSO['cases-attachments'].attachmentId).to.be('legacy-er-endpoint-1');
        // Comment lifted out of metadata onto data.content.
        expect(unifiedSO['cases-attachments'].data?.content).to.be(unifiedData.content);
        expect(unifiedSO['cases-attachments'].metadata).not.to.have.property('comment');

        const legacySOs = await searchSO(CASE_COMMENT_SAVED_OBJECT, fileComment.id);
        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('accepts a legacy `actions` payload and folds it to a unified `security.endpoint` row (asymmetric retirement)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentActionsReq,
        });

        const actionsComment = patched.comments![0];
        expect(actionsComment.type).to.be(AttachmentType.externalReference);

        const unifiedSOs = await searchSO(CASE_ATTACHMENT_SAVED_OBJECT, actionsComment.id);
        expect(unifiedSOs.hits.hits.length).to.be(1);

        const unifiedSO = unifiedSOs.hits.hits[0]._source as {
          'cases-attachments': {
            type: string;
            attachmentId: string;
            data?: { content?: string };
            metadata?: {
              command?: string;
              targets?: Array<{ endpointId: string; hostname: string; agentType: string }>;
              comment?: unknown;
            };
          };
        };
        expect(unifiedSO['cases-attachments'].type).to.be(SECURITY_ENDPOINT_ATTACHMENT_TYPE);
        // Synthetic sentinel — legacy `actions` had no foreign reference id.
        expect(unifiedSO['cases-attachments'].attachmentId).to.be('legacy-actions');
        expect(unifiedSO['cases-attachments'].data?.content).to.be(postCommentActionsReq.comment);
        expect(unifiedSO['cases-attachments'].metadata?.command).to.be(
          postCommentActionsReq.actions.type
        );
        // Legacy `actions` targets had no agentType; the transformer defaults to 'endpoint'.
        expect(unifiedSO['cases-attachments'].metadata?.targets).to.eql(
          postCommentActionsReq.actions.targets.map((t) => ({ ...t, agentType: 'endpoint' }))
        );
        expect(unifiedSO['cases-attachments'].metadata).not.to.have.property('comment');

        const legacySOs = await searchSO(CASE_COMMENT_SAVED_OBJECT, actionsComment.id);
        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('400s a unified `security.endpoint` with empty targets', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedEndpointPayload({ metadata: { ...unifiedMetadata, targets: [] } }),
          expectedHttpCode: 400,
        });
      });

      it('400s a unified `security.endpoint` missing data.content', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedEndpointPayload({ data: undefined }),
          expectedHttpCode: 400,
        });
      });

      it('400s a unified `security.endpoint` with a stray metadata.comment (strict reject)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedEndpointPayload({
            metadata: { ...unifiedMetadata, comment: 'belongs on data.content' },
          }),
          expectedHttpCode: 400,
        });
      });

      it('400s a legacy `actions` payload with empty targets (transformer rejection surfaces as 400)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            ...postCommentActionsReq,
            actions: { ...postCommentActionsReq.actions, targets: [] },
          },
          expectedHttpCode: 400,
        });
      });
    });

    describe('read', () => {
      it('GET projects a unified `security.endpoint` row back to the legacy externalReference shape', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedEndpointPayload({ attachmentId: 'unified-endpoint-read-1' }),
        });
        const attachmentId = patched.comments![0].id;

        const fetched = (await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: attachmentId,
        })) as unknown as {
          id: string;
          type: string;
          externalReferenceAttachmentTypeId: string;
          externalReferenceStorage: { type: string };
          externalReferenceMetadata: Record<string, unknown> | null;
        };

        expect(fetched.type).to.be(AttachmentType.externalReference);
        expect(fetched.externalReferenceAttachmentTypeId).to.be('endpoint');
        expect(fetched.externalReferenceStorage.type).to.be('elasticSearchDoc');
        // data.content is lowered back into externalReferenceMetadata.comment on read.
        expect(fetched.externalReferenceMetadata?.comment).to.be(unifiedData.content);
        expect(fetched.externalReferenceMetadata?.command).to.be('isolate');
        expect(fetched.externalReferenceMetadata?.targets).to.eql(unifiedTargets);
      });

      it('GET projects a legacy `actions`-origin row back to the legacy externalReference shape (never re-emits `actions`)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentActionsReq,
        });
        const attachmentId = patched.comments![0].id;

        const fetched = (await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: attachmentId,
        })) as unknown as {
          type: string;
          externalReferenceId: string;
          externalReferenceAttachmentTypeId: string;
          externalReferenceMetadata: Record<string, unknown> | null;
        };

        expect(fetched.type).to.be(AttachmentType.externalReference);
        expect(fetched.externalReferenceAttachmentTypeId).to.be('endpoint');
        // Synthetic sentinel id survives the round trip so the synthetic origin
        // stays discoverable to consumers / log readers.
        expect(fetched.externalReferenceId).to.be('legacy-actions');
        expect(fetched.externalReferenceMetadata?.comment).to.be(postCommentActionsReq.comment);
        expect(fetched.externalReferenceMetadata?.command).to.be(
          postCommentActionsReq.actions.type
        );
      });
    });

    describe('delete', () => {
      it('deletes a unified `security.endpoint` attachment by id', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedEndpointPayload({ attachmentId: 'unified-endpoint-delete-1' }),
        });
        const attachmentId = patched.comments![0].id;

        await deleteComment({
          supertest,
          caseId: postedCase.id,
          commentId: attachmentId,
        });

        const unifiedSOs = await searchSO(CASE_ATTACHMENT_SAVED_OBJECT, attachmentId);
        expect(unifiedSOs.hits.hits.length).to.be(0);
      });
    });
  });
};
