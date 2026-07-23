/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  INDICATOR_ATTACHMENT_TYPE,
  LEGACY_INDICATOR_ATTACHMENT_TYPE,
  AttachmentType,
  ExternalReferenceStorageType,
} from '@kbn/cases-plugin/common';
import type { AttachmentRequest } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq } from '../../../../common/lib/mock';
import { createCase, createComment, deleteAllCaseItems } from '../../../../common/lib/api';

/**
 * Legacy external-reference shape. Existing clients persisted indicator metadata
 * under `externalReferenceMetadata`; the unified schema validates these payloads
 * via `EXTERNAL_REFERENCE_TYPE_MAP[LEGACY_INDICATOR_ATTACHMENT_TYPE]`.
 */
const legacyIndicatorPayload = (overrides: Record<string, unknown> = {}): AttachmentRequest =>
  ({
    type: AttachmentType.externalReference,
    externalReferenceId: 'indicator-1',
    externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
    externalReferenceAttachmentTypeId: LEGACY_INDICATOR_ATTACHMENT_TYPE,
    externalReferenceMetadata: {
      indicatorName: 'malware.exe',
      indicatorType: 'file',
      indicatorFeedName: '[Filebeat] AbuseCH Malware',
    },
    owner: 'securitySolutionFixture',
    ...overrides,
  } as AttachmentRequest);

/**
 * Unified shape that the new indicator writer posts. `createComment`'s `params` is
 * still typed against V1 `AttachmentRequest` on this branch — the V1→V2 cleanup
 * lands in #269822 — so cast through `unknown` for the unified fields.
 */
const unifiedIndicatorPayload = (overrides: Record<string, unknown> = {}): AttachmentRequest =>
  ({
    type: INDICATOR_ATTACHMENT_TYPE,
    attachmentId: 'indicator-1',
    metadata: {
      indicatorName: 'malware.exe',
      indicatorType: 'file',
      indicatorFeedName: '[Filebeat] AbuseCH Malware',
    },
    owner: 'securitySolutionFixture',
    ...overrides,
  } as unknown as AttachmentRequest);

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Indicator attachment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('legacy externalReference POSTs', () => {
      it('accepts a legacy `indicator` externalReference payload (200)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyIndicatorPayload(),
        });
        expect(patched.comments?.length).to.be(1);
      });

      it('returns 400 when the legacy payload has invalid metadata (number instead of string)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyIndicatorPayload({
            externalReferenceMetadata: {
              indicatorName: 123,
              indicatorType: 'file',
              indicatorFeedName: 'feed',
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
          params: legacyIndicatorPayload({
            externalReferenceMetadata: {
              indicatorName: 'n',
              indicatorType: 't',
              indicatorFeedName: 'f',
              extra: 'nope',
            },
          }),
          expectedHttpCode: 400,
        });
      });
    });

    describe('unified `indicator` POSTs', () => {
      it('returns 400 when metadata is missing a required field', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedIndicatorPayload({
            metadata: { indicatorName: 'n', indicatorType: 't' },
          }),
          expectedHttpCode: 400,
        });
      });

      it('returns 400 when metadata has an unknown key', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedIndicatorPayload({
            metadata: {
              indicatorName: 'n',
              indicatorType: 't',
              indicatorFeedName: 'f',
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
          params: unifiedIndicatorPayload({ extra: 'nope' }),
          expectedHttpCode: 400,
        });
      });
    });
  });
};
