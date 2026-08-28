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
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
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

    describe('legacy `actions` writes (FF OFF)', () => {
      // Legacy `actions` POSTs bypass the unified Zod schema (the legacy
      // validator branches only cover externalReference / persistableState);
      // with the FF off the cases server persists the payload as-is on
      // `cases-comments` without invoking `actionsAttachmentTransformer`. The
      // transformer-level rejections (empty targets, non-security owner) are
      // exercised in the flag-ON FTR companion.
      it('accepts a legacy `actions` POST', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentActionsReq,
          expectedHttpCode: 200,
        });

        expect(patched.comments?.length).to.be(1);
        expect(patched.comments![0].type).to.be(AttachmentType.actions);
      });

      it('persists the legacy `actions` shape byte-clean on cases-comments', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentActionsReq,
        });

        const attachmentId = patched.comments![0].id;

        const esResponse = await getSOFromKibanaIndex({
          es,
          soType: CASE_COMMENT_SAVED_OBJECT,
          soId: attachmentId,
        });

        const storedAttributes = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT] as
          | Record<string, unknown>
          | undefined;
        expect(storedAttributes).to.be.ok();

        expect(storedAttributes!.type).to.be(AttachmentType.actions);
        expect(storedAttributes!.comment).to.be(postCommentActionsReq.comment);
        expect(storedAttributes!.actions).to.eql(postCommentActionsReq.actions);

        // Must not leak any unified-only fields onto the legacy `actions` SO row.
        expect(storedAttributes!).not.to.have.property('attachmentId');
        expect(storedAttributes!).not.to.have.property('metadata');
        expect(storedAttributes!).not.to.have.property('data');
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
