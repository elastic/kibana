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
import { postCaseReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  getSOFromKibanaIndex,
} from '../../../../common/lib/api';

/**
 * HTTP-boundary coverage for the `security.endpoint` unified attachment.
 *
 *  1. Legacy-shape writes
 *     (`{ type: 'externalReference', externalReferenceAttachmentTypeId: 'endpoint', ... }`)
 *     must continue to succeed after dropping the security_solution-side
 *     legacy `registerExternalReference({ id: 'endpoint' })` registration. The
 *     cases-plugin routes them through `EXTERNAL_REFERENCE_TYPE_MAP` to the
 *     unified validator and re-validates against the registered Zod schema.
 *  2. Invalid endpoint metadata must surface as HTTP 400, not 500. Switching
 *     from the legacy `schemaValidator` to `schema:` swaps io-ts for Zod and
 *     tightens the validator into a strict closed shape.
 *  3. Unified `security.endpoint` writes posted while the FF is OFF must not
 *     leak unified-only attributes (`attachmentId`, `metadata`, `data`) into
 *     the legacy `cases-comments` `_source`.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const validMetadata = {
    command: 'isolate',
    comment: 'Isolated host because of suspicious activity',
    targets: [
      {
        endpointId: 'endpoint-1',
        hostname: 'host-1',
        agentType: 'endpoint' as const,
      },
    ],
  };

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
            externalReferenceMetadata: validMetadata,
            owner: 'securitySolutionFixture',
          } as unknown as AttachmentRequest,
          expectedHttpCode: 200,
        });
      });

      it('rejects a legacy `externalReference` endpoint POST with empty targets as 400 (not 500)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: 'externalReference',
            externalReferenceId: 'action-id-2',
            externalReferenceStorage: { type: 'elasticSearchDoc' },
            externalReferenceAttachmentTypeId: 'endpoint',
            externalReferenceMetadata: { ...validMetadata, targets: [] },
            owner: 'securitySolutionFixture',
          } as unknown as AttachmentRequest,
          expectedHttpCode: 400,
        });
      });
    });

    describe('unified payload validation returns 400, not 500', () => {
      it('returns 400 when `targets` is empty', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
            attachmentId: 'action-id-3',
            metadata: { ...validMetadata, targets: [] },
            owner: 'securitySolutionFixture',
          } as unknown as AttachmentRequest,
          expectedHttpCode: 400,
        });
      });

      it('returns 400 when `agentType` is not a known value', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
            attachmentId: 'action-id-4',
            metadata: {
              ...validMetadata,
              targets: [
                {
                  endpointId: 'endpoint-1',
                  hostname: 'host-1',
                  agentType: 'not-a-real-agent',
                },
              ],
            },
            owner: 'securitySolutionFixture',
          } as unknown as AttachmentRequest,
          expectedHttpCode: 400,
        });
      });

      it('returns 400 when `command` is missing', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
            attachmentId: 'action-id-5',
            metadata: { comment: validMetadata.comment, targets: validMetadata.targets },
            owner: 'securitySolutionFixture',
          } as unknown as AttachmentRequest,
          expectedHttpCode: 400,
        });
      });

      it('returns 400 when an unknown top-level metadata key is present (strict)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
            attachmentId: 'action-id-6',
            metadata: { ...validMetadata, extra: 'nope' },
            owner: 'securitySolutionFixture',
          } as unknown as AttachmentRequest,
          expectedHttpCode: 400,
        });
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
      });
    });
  });
};
