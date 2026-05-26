/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  OSQUERY_ATTACHMENT_TYPE,
  CASE_COMMENT_SAVED_OBJECT,
  AttachmentType,
  ExternalReferenceStorageType,
} from '@kbn/cases-plugin/common';
import type { AttachmentRequestV2 } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  getSOFromKibanaIndex,
} from '../../../../common/lib/api';

/**
 * Legacy external-reference shape. Real-world legacy clients persisted the
 * action id inside `externalReferenceMetadata.actionId`; the schema accepts
 * that for backward compatibility.
 */
const legacyOsqueryPayload = (overrides: Record<string, unknown> = {}): AttachmentRequestV2 =>
  ({
    type: AttachmentType.externalReference,
    externalReferenceId: 'action-1',
    externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
    externalReferenceAttachmentTypeId: 'osquery',
    externalReferenceMetadata: {
      actionId: 'action-1',
      agentIds: ['agent-1'],
      queryId: 'query-1',
    },
    owner: 'securitySolutionFixture',
    ...overrides,
  } as AttachmentRequestV2);

/** Unified shape that the new osquery writer posts. */
const unifiedOsqueryPayload = (overrides: Record<string, unknown> = {}): AttachmentRequestV2 =>
  ({
    type: OSQUERY_ATTACHMENT_TYPE,
    attachmentId: 'action-1',
    metadata: {
      agentIds: ['agent-1'],
      queryId: 'query-1',
    },
    owner: 'securitySolutionFixture',
    ...overrides,
  } as AttachmentRequestV2);

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Osquery attachment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('legacy externalReference POSTs', () => {
      it('accepts a legacy `osquery` externalReference payload (200)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyOsqueryPayload(),
        });
        expect(patched.comments?.length).to.be(1);
      });

      it('returns 400 when the legacy payload has invalid metadata (string instead of array)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyOsqueryPayload({
            externalReferenceMetadata: {
              actionId: 'action-1',
              agentIds: 'not-an-array',
              queryId: 'query-1',
            },
          }),
          expectedHttpCode: 400,
        });
      });

      it('returns 400 when the legacy payload has unknown metadata keys', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyOsqueryPayload({
            externalReferenceMetadata: {
              actionId: 'action-1',
              agentIds: ['agent-1'],
              queryId: 'query-1',
              extra: 'nope',
            },
          }),
          expectedHttpCode: 400,
        });
      });

      it('persists the legacy externalReference shape on cases-comments', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyOsqueryPayload(),
        });
        const commentId = patched.comments![0].id;

        const esResponse = await getSOFromKibanaIndex({
          es,
          soType: CASE_COMMENT_SAVED_OBJECT,
          soId: commentId,
        });

        const source = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT] as Record<
          string,
          unknown
        >;
        expect(source).to.be.ok();
        // Legacy externalReference shape is stored as-is on cases-comments and
        // must not pick up any unified-only fields.
        expect(source.type).to.be('externalReference');
        expect(source.externalReferenceAttachmentTypeId).to.be('osquery');
        expect(source.externalReferenceId).to.be('action-1');
        expect(source.externalReferenceMetadata).to.eql({
          actionId: 'action-1',
          agentIds: ['agent-1'],
          queryId: 'query-1',
        });
        expect(source.attachmentId).to.be(undefined);
        expect(source.metadata).to.be(undefined);
        expect(source.data).to.be(undefined);
      });
    });

    describe('unified `osquery` POSTs', () => {
      it('accepts a unified `osquery` payload (200)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedOsqueryPayload(),
        });
        expect(patched.comments?.length).to.be(1);
      });

      it('returns 400 when metadata is missing a required field', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedOsqueryPayload({
            metadata: { agentIds: ['agent-1'] },
          }),
          expectedHttpCode: 400,
        });
      });

      it('returns 400 when metadata has an unknown key', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedOsqueryPayload({
            metadata: {
              agentIds: ['agent-1'],
              queryId: 'query-1',
              unknown: 'nope',
            },
          }),
          expectedHttpCode: 400,
        });
      });

      it('returns 400 when the top-level payload has an unknown key', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedOsqueryPayload({ extra: 'nope' }),
          expectedHttpCode: 400,
        });
      });

      it('does not leak `attachmentId` / `metadata` / `data` into the cases-comments SO when flag is OFF', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedOsqueryPayload(),
        });
        const commentId = patched.comments![0].id;

        const esResponse = await getSOFromKibanaIndex({
          es,
          soType: CASE_COMMENT_SAVED_OBJECT,
          soId: commentId,
        });

        const source = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT] as Record<
          string,
          unknown
        >;
        expect(source).to.be.ok();
        // Unified-only fields must not be persisted into the legacy SO source.
        expect(source.attachmentId).to.be(undefined);
        expect(source.metadata).to.be(undefined);
        expect(source.data).to.be(undefined);
        // Legacy storage round-trip should yield the externalReference shape.
        expect(source.type).to.be('externalReference');
        expect(source.externalReferenceAttachmentTypeId).to.be('osquery');
      });
    });
  });
};
