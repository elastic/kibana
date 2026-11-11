/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CASE_COMMENT_SAVED_OBJECT,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import type { AttachmentRequest } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq, postCommentActionsReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  getSOFromKibanaIndex,
} from '../../../../common/lib/api';

/**
 * FF-OFF byte-clean coverage for the `security.endpoint` unified attachment.
 * Flag-agnostic validator-400 assertions live in the FF-ON companion
 * (`common/attachments_framework/endpoint.ts`).
 *
 *  1. Legacy-shape writes
 *     (`{ type: 'externalReference', externalReferenceAttachmentTypeId: 'endpoint', ... }`)
 *     must continue to succeed after dropping the security_solution-side
 *     legacy `registerExternalReference({ id: 'endpoint' })` registration. The
 *     cases-plugin routes them through `EXTERNAL_REFERENCE_TYPE_MAP` to the
 *     unified validator and re-validates against the registered Zod schema.
 *  2. Unified `security.endpoint` writes posted while the FF is OFF must not
 *     leak unified-only attributes (`attachmentId`, `metadata`, `data`) into
 *     the legacy `cases-comments` `_source`.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const validMetadata = {
    command: 'isolate',
    targets: [
      {
        endpointId: 'endpoint-1',
        hostname: 'host-1',
        agentType: 'endpoint' as const,
      },
    ],
  };

  // Legacy externalReference payloads keep the analyst comment on
  // `externalReferenceMetadata.comment`
  const legacyMetadata = {
    ...validMetadata,
    comment: 'Isolated host because of suspicious activity',
  };

  const validData = { content: 'Isolated host because of suspicious activity' };

  describe('Endpoint unified attachment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('legacy-shape writes are routed to the unified validator', () => {
      it('accepts a legacy `externalReference` endpoint POST after dropping the legacy registration', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: 'externalReference',
            externalReferenceId: 'action-id-1',
            externalReferenceStorage: { type: 'elasticSearchDoc' },
            externalReferenceAttachmentTypeId: 'endpoint',
            externalReferenceMetadata: legacyMetadata,
            owner: 'securitySolutionFixture',
          } as unknown as AttachmentRequest,
          expectedHttpCode: 200,
        });
      });
    });

    // TODO(https://github.com/elastic/security-team/issues/16996 Phase 3): legacy
    // `actions` writes now fold to `security.endpoint` unconditionally (same as
    // FF-ON, see `common/attachments_framework/endpoint.ts`), so the FF-OFF
    // byte-clean carve-out no longer holds. Until Phase 3 rejects `actions` at
    // validation, this is a runtime guard that the FF-OFF write path still
    // succeeds (does not 500) — the resulting shape is intentionally unasserted.
    describe('legacy `actions` writes (FF OFF)', () => {
      it('accepts a legacy `actions` POST (folds forward, no 500)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentActionsReq,
          expectedHttpCode: 200,
        });

        expect(patched.comments?.length).to.be(1);
      });
    });

    describe('byte-clean legacy storage (FF OFF)', () => {
      it('does not persist `attachmentId` / `metadata` / `data` on the legacy cases-comments SO', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
            attachmentId: 'action-id-7',
            data: validData,
            metadata: validMetadata,
            owner: 'securitySolutionFixture',
          } as unknown as AttachmentRequest,
        });

        const attachmentId = patchedCase.comments![0].id;

        const esResponse = await getSOFromKibanaIndex({
          es,
          soType: CASE_COMMENT_SAVED_OBJECT,
          soId: attachmentId,
        });

        const storedAttributes = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT] as
          | Record<string, unknown>
          | undefined;
        expect(storedAttributes).to.be.ok();

        expect(storedAttributes!.type).to.be('externalReference');
        expect(storedAttributes!.externalReferenceAttachmentTypeId).to.be('endpoint');

        expect(storedAttributes!).not.to.have.property('attachmentId');
        expect(storedAttributes!).not.to.have.property('metadata');
        expect(storedAttributes!).not.to.have.property('data');

        // The unified `data.content` is projected back to
        // `externalReferenceMetadata.comment` for legacy on-disk shape.
        const externalReferenceMetadata = storedAttributes!.externalReferenceMetadata as
          | Record<string, unknown>
          | undefined;
        expect(externalReferenceMetadata?.comment).to.be(validData.content);
      });
    });
  });
};
