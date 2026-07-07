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
  OSQUERY_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import {
  AttachmentType,
  ExternalReferenceStorageType,
} from '@kbn/cases-plugin/common/types/domain';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type { AttachmentRequestV2 } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { postCaseReq } from '../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  deleteComment,
  getComment,
} from '../../../common/lib/api';

const unifiedOsqueryPayload = (overrides: Record<string, unknown> = {}): AttachmentRequestV2 =>
  ({
    type: OSQUERY_ATTACHMENT_TYPE,
    attachmentId: 'action-unified-1',
    metadata: {
      agentIds: ['agent-1'],
      queryId: 'query-1',
    },
    owner: 'securitySolutionFixture',
    ...overrides,
  } as AttachmentRequestV2);

const legacyOsqueryPayload = (overrides: Record<string, unknown> = {}): AttachmentRequestV2 =>
  ({
    type: AttachmentType.externalReference,
    externalReferenceId: 'action-legacy-1',
    externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
    externalReferenceAttachmentTypeId: OSQUERY_ATTACHMENT_TYPE,
    externalReferenceMetadata: {
      actionId: 'action-legacy-1',
      agentIds: ['agent-1'],
      queryId: 'query-1',
    },
    owner: 'securitySolutionFixture',
    ...overrides,
  } as AttachmentRequestV2);

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Unified Osquery — CRUD with flag ON', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('create', () => {
      it('writes a unified `osquery` payload to cases-attachments (flag ON)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedOsqueryPayload(),
        });

        const osqueryComment = patched.comments![0];

        const unifiedSOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${osqueryComment.id}` } },
              ],
            },
          },
        });

        expect(unifiedSOs.hits.hits.length).to.be(1);
        const unifiedSO = unifiedSOs.hits.hits[0]._source as {
          'cases-attachments': {
            type: string;
            attachmentId: string;
            metadata?: { agentIds?: string[]; queryId?: string };
          };
        };
        expect(unifiedSO['cases-attachments'].type).to.be(OSQUERY_ATTACHMENT_TYPE);
        expect(unifiedSO['cases-attachments'].attachmentId).to.be('action-unified-1');
        expect(unifiedSO['cases-attachments'].metadata?.agentIds).to.eql(['agent-1']);
        expect(unifiedSO['cases-attachments'].metadata?.queryId).to.be('query-1');

        // With the flag ON the row must NOT also exist in the legacy SO index.
        const legacySOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_COMMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_COMMENT_SAVED_OBJECT}:${osqueryComment.id}` } },
              ],
            },
          },
        });
        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('accepts a legacy externalReference `osquery` payload and persists it as a unified row', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyOsqueryPayload(),
        });

        const osqueryComment = patched.comments![0];

        const unifiedSOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${osqueryComment.id}` } },
              ],
            },
          },
        });
        // Server-side transformer promotes the legacy payload to the unified
        // shape on write, so it lands in cases-attachments regardless of the
        // request shape.
        expect(unifiedSOs.hits.hits.length).to.be(1);
        const unifiedSO = unifiedSOs.hits.hits[0]._source as {
          'cases-attachments': {
            type: string;
            attachmentId: string;
            metadata?: { actionId?: string; agentIds?: string[]; queryId?: string };
          };
        };
        expect(unifiedSO['cases-attachments'].type).to.be(OSQUERY_ATTACHMENT_TYPE);
        expect(unifiedSO['cases-attachments'].attachmentId).to.be('action-legacy-1');
        // Legacy `externalReferenceMetadata` carries `actionId` for back-compat;
        // the transformer preserves the full metadata blob on the unified row.
        expect(unifiedSO['cases-attachments'].metadata?.agentIds).to.eql(['agent-1']);
        expect(unifiedSO['cases-attachments'].metadata?.queryId).to.be('query-1');

        const legacySOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_COMMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_COMMENT_SAVED_OBJECT}:${osqueryComment.id}` } },
              ],
            },
          },
        });
        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('rejects a unified `osquery` payload with an unknown metadata field', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedOsqueryPayload({
            metadata: {
              agentIds: ['agent-1'],
              queryId: 'query-1',
              extra: 'nope',
            },
          }),
          expectedHttpCode: 400,
        });
      });

      it('rejects a legacy externalReference `osquery` payload with malformed metadata', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyOsqueryPayload({
            externalReferenceMetadata: {
              actionId: 'action-legacy-1',
              agentIds: 'not-an-array',
              queryId: 'query-1',
            },
          }),
          expectedHttpCode: 400,
        });
      });
    });

    describe('read', () => {
      it('returns the osquery attachment via GET projected back to legacy externalReference shape', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedOsqueryPayload(),
        });

        const osqueryComment = patched.comments![0];

        const fetched = (await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: osqueryComment.id,
        })) as unknown as {
          id: string;
          type: string;
          externalReferenceAttachmentTypeId: string;
          externalReferenceStorage: { type: string };
          externalReferenceMetadata: Record<string, unknown> | null;
          owner: string;
        };

        expect(fetched.id).to.be(osqueryComment.id);
        // Legacy projection: unified `osquery` rows are projected back to
        // `externalReference` (elasticSearchDoc storage) for API consumers.
        expect(fetched.type).to.be(AttachmentType.externalReference);
        expect(fetched.externalReferenceAttachmentTypeId).to.be(OSQUERY_ATTACHMENT_TYPE);
        expect(fetched.externalReferenceStorage.type).to.be(
          ExternalReferenceStorageType.elasticSearchDoc
        );
        expect(fetched.externalReferenceMetadata?.agentIds).to.eql(['agent-1']);
        expect(fetched.externalReferenceMetadata?.queryId).to.be('query-1');
        expect(fetched.owner).to.be('securitySolutionFixture');
      });

      it('reads a pre-existing legacy `cases-comments` osquery SO cohesively (transformer round-trip)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        // Write directly into the legacy `cases-comments` SO index to simulate
        // an osquery attachment that predates the flag-ON migration. This
        // exercises the transformer's read path: legacy storage -> unified
        // domain -> legacy API projection.
        const seededId = 'osquery-seeded-legacy';
        await es.index({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: `${CASE_COMMENT_SAVED_OBJECT}:${seededId}`,
          refresh: 'wait_for',
          document: {
            type: CASE_COMMENT_SAVED_OBJECT,
            [CASE_COMMENT_SAVED_OBJECT]: {
              type: AttachmentType.externalReference,
              externalReferenceId: 'seeded-action-1',
              externalReferenceStorage: {
                type: ExternalReferenceStorageType.elasticSearchDoc,
              },
              externalReferenceAttachmentTypeId: OSQUERY_ATTACHMENT_TYPE,
              externalReferenceMetadata: {
                actionId: 'seeded-action-1',
                agentIds: ['seeded-agent'],
                queryId: 'seeded-query',
              },
              owner: 'securitySolutionFixture',
              created_at: '2024-01-01T00:00:00.000Z',
              created_by: { username: 'elastic', full_name: null, email: null },
              pushed_at: null,
              pushed_by: null,
              updated_at: null,
              updated_by: null,
            },
            references: [{ type: 'cases', id: postedCase.id, name: 'associated-cases' }],
            namespaces: ['default'],
            updated_at: '2024-01-01T00:00:00.000Z',
            coreMigrationVersion: '8.8.0',
          },
        });

        const fetched = (await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: seededId,
        })) as unknown as {
          id: string;
          type: string;
          externalReferenceAttachmentTypeId: string;
          externalReferenceMetadata: Record<string, unknown> | null;
        };

        expect(fetched.id).to.be(seededId);
        expect(fetched.type).to.be(AttachmentType.externalReference);
        expect(fetched.externalReferenceAttachmentTypeId).to.be(OSQUERY_ATTACHMENT_TYPE);
        expect(fetched.externalReferenceMetadata?.agentIds).to.eql(['seeded-agent']);
        expect(fetched.externalReferenceMetadata?.queryId).to.be('seeded-query');
      });
    });

    describe('delete', () => {
      it('deletes a unified osquery attachment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedOsqueryPayload(),
        });

        const osqueryComment = patched.comments![0];

        await deleteComment({
          supertest,
          caseId: postedCase.id,
          commentId: osqueryComment.id,
        });

        await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: osqueryComment.id,
          expectedHttpCode: 404,
        });
      });
    });
  });
};
