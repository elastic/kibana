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
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
} from '@kbn/cases-plugin/common/constants';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
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

  const searchSO = (soType: string, soId: string) =>
    es.search({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      query: {
        bool: {
          must: [{ term: { type: soType } }, { term: { _id: `${soType}:${soId}` } }],
        },
      },
    });

  describe('Indicator attachment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('unified `indicator` 200 path', () => {
      it('writes a unified `security.indicator` payload to cases-attachments (flag ON)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedIndicatorPayload(),
        });

        const indicatorComment = patched.comments![0];

        const unifiedSOs = await searchSO(CASE_ATTACHMENT_SAVED_OBJECT, indicatorComment.id);
        expect(unifiedSOs.hits.hits.length).to.be(1);
        const unifiedSO = unifiedSOs.hits.hits[0]._source as {
          'cases-attachments': {
            type: string;
            attachmentId: string;
            metadata?: {
              indicatorName?: string;
              indicatorType?: string;
              indicatorFeedName?: string;
            };
          };
        };
        expect(unifiedSO['cases-attachments'].type).to.be(INDICATOR_ATTACHMENT_TYPE);
        expect(unifiedSO['cases-attachments'].attachmentId).to.be('indicator-1');
        expect(unifiedSO['cases-attachments'].metadata?.indicatorName).to.be('malware.exe');
        expect(unifiedSO['cases-attachments'].metadata?.indicatorType).to.be('file');

        // With the flag ON the row must NOT also exist in the legacy SO index.
        const legacySOs = await searchSO(CASE_COMMENT_SAVED_OBJECT, indicatorComment.id);
        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('lifts a legacy externalReference `indicator` payload onto a unified cases-attachments row', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patched = await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyIndicatorPayload(),
        });

        const indicatorComment = patched.comments![0];

        // Server-side transformer promotes the legacy payload to the unified shape
        // on write, so it lands in cases-attachments regardless of request shape.
        const unifiedSOs = await searchSO(CASE_ATTACHMENT_SAVED_OBJECT, indicatorComment.id);
        expect(unifiedSOs.hits.hits.length).to.be(1);
        const unifiedSO = unifiedSOs.hits.hits[0]._source as {
          'cases-attachments': {
            type: string;
            metadata?: { indicatorName?: string; indicatorFeedName?: string };
          };
        };
        expect(unifiedSO['cases-attachments'].type).to.be(INDICATOR_ATTACHMENT_TYPE);
        expect(unifiedSO['cases-attachments'].metadata?.indicatorName).to.be('malware.exe');

        const legacySOs = await searchSO(CASE_COMMENT_SAVED_OBJECT, indicatorComment.id);
        expect(legacySOs.hits.hits.length).to.be(0);
      });
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
