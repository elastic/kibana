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
  FILE_ATTACHMENT_TYPE,
  LEGACY_FILE_ATTACHMENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '@kbn/cases-plugin/common/constants';
import { constructFileKindIdByOwner } from '@kbn/cases-plugin/common/files';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import type { AttachmentRequest } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  fileMetadata,
  getFilesAttachmentReq,
  postCaseReq,
  postFileReq,
} from '../../../common/lib/mock';
import {
  bulkCreateAttachments,
  createCase,
  createComment,
  createFile,
  createFileAttachment,
  deleteAllCaseItems,
  deleteAllFiles,
  getCase,
  getComment,
} from '../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const caseRequest = { ...postCaseReq, owner: SECURITY_SOLUTION_OWNER };
  const fileKind = constructFileKindIdByOwner(SECURITY_SOLUTION_OWNER);

  const seedFile = async (caseId: string) => {
    const created = await createFile({
      supertest,
      params: {
        name: 'seed_file',
        kind: fileKind,
        mimeType: 'image/png',
        meta: {
          caseIds: [caseId],
          owner: [SECURITY_SOLUTION_OWNER],
        },
      },
    });
    return created.file.id;
  };

  describe('Unified Files — CRUD, references, mixed reads', () => {
    afterEach(async () => {
      await deleteAllFiles({ supertest });
      await deleteAllCaseItems(es);
    });

    describe('create via POST /:caseId/files (multipart)', () => {
      it('writes a unified `file` row to cases-attachments when the flag is ON', async () => {
        const postedCase = await createCase(supertest, caseRequest);
        const patchedCase = await createFileAttachment({
          supertest,
          caseId: postedCase.id,
          params: postFileReq,
        });

        const fileComment = patchedCase.comments![0];
        expect(fileComment.type).to.be('externalReference');

        const unifiedSOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${fileComment.id}` } },
              ],
            },
          },
        });

        expect(unifiedSOs.hits.hits.length).to.be(1);
        const unifiedSO = unifiedSOs.hits.hits[0]._source as {
          'cases-attachments': { type: string; metadata?: { soType?: string } };
          references: Array<{ id: string; name: string; type: string }>;
        };
        expect(unifiedSO['cases-attachments'].type).to.be('file');
        expect(unifiedSO['cases-attachments'].metadata?.soType).to.be(FILE_SO_TYPE);
        const fileRef = unifiedSO.references.find((ref) => ref.type === FILE_SO_TYPE);
        expect(fileRef).to.be.ok();

        const legacySOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_COMMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_COMMENT_SAVED_OBJECT}:${fileComment.id}` } },
              ],
            },
          },
        });
        expect(legacySOs.hits.hits.length).to.be(0);
      });
    });

    describe('read', () => {
      it('returns the file attachment via GET /:caseId/comments/:commentId, projected to legacy externalReference shape', async () => {
        const postedCase = await createCase(supertest, caseRequest);
        const patchedCase = await createFileAttachment({
          supertest,
          caseId: postedCase.id,
          params: postFileReq,
        });

        const fileComment = patchedCase.comments![0];

        const fetched = (await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: fileComment.id,
        })) as unknown as {
          id: string;
          type: string;
          externalReferenceAttachmentTypeId: string;
          externalReferenceStorage: { type: string; soType?: string };
          externalReferenceMetadata: Record<string, unknown> | null;
        };

        expect(fetched.id).to.be(fileComment.id);
        // Legacy projection: unified `file` is projected back to `externalReference`
        // with `.files` subtype, savedObject storage, and `FILE_SO_TYPE`.
        expect(fetched.type).to.be('externalReference');
        expect(fetched.externalReferenceAttachmentTypeId).to.be('.files');
        expect(fetched.externalReferenceStorage.type).to.be('savedObject');
        expect(fetched.externalReferenceStorage.soType).to.be(FILE_SO_TYPE);
        // soType lives on storage (lowered), not on metadata, in the API projection.
        expect((fetched.externalReferenceMetadata as { soType?: string } | null)?.soType).to.be(
          undefined
        );
      });
    });

    describe('create via POST /:caseId/comments', () => {
      it('accepts a legacy `.files` payload and stores it as a unified `file` row', async () => {
        const postedCase = await createCase(supertest, caseRequest);
        const fileId = await seedFile(postedCase.id);

        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: getFilesAttachmentReq({
            externalReferenceId: fileId,
            owner: SECURITY_SOLUTION_OWNER,
          }),
        });

        const fileComment = patchedCase.comments![0];
        // The API projection always returns the legacy externalReference shape.
        expect(fileComment.type).to.be('externalReference');

        // With the flag ON the row is written to `cases-attachments`, not the
        // legacy `cases-comments` index, regardless of the request shape.
        const unifiedSOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${fileComment.id}` } },
              ],
            },
          },
        });
        expect(unifiedSOs.hits.hits.length).to.be(1);
        const unifiedSO = unifiedSOs.hits.hits[0]._source as {
          'cases-attachments': { type: string; metadata?: { soType?: string } };
        };
        expect(unifiedSO['cases-attachments'].type).to.be(FILE_ATTACHMENT_TYPE);
        expect(unifiedSO['cases-attachments'].metadata?.soType).to.be(FILE_SO_TYPE);

        const legacySOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_COMMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_COMMENT_SAVED_OBJECT}:${fileComment.id}` } },
              ],
            },
          },
        });
        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('accepts a unified `file` payload and stores it as a unified `file` row', async () => {
        const postedCase = await createCase(supertest, caseRequest);
        const fileId = await seedFile(postedCase.id);

        const unifiedRequest = {
          type: FILE_ATTACHMENT_TYPE,
          attachmentId: fileId,
          owner: SECURITY_SOLUTION_OWNER,
          metadata: {
            soType: FILE_SO_TYPE,
            files: [fileMetadata()],
          },
        } as unknown as AttachmentRequest;

        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: unifiedRequest,
        });

        const fileComment = patchedCase.comments![0] as unknown as {
          id: string;
          type: string;
          externalReferenceAttachmentTypeId: string;
        };
        expect(fileComment.type).to.be('externalReference');
        expect(fileComment.externalReferenceAttachmentTypeId).to.be(LEGACY_FILE_ATTACHMENT_TYPE);

        const unifiedSOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${fileComment.id}` } },
              ],
            },
          },
        });
        expect(unifiedSOs.hits.hits.length).to.be(1);
        const unifiedSO = unifiedSOs.hits.hits[0]._source as {
          'cases-attachments': { type: string; metadata?: { soType?: string } };
        };
        expect(unifiedSO['cases-attachments'].type).to.be(FILE_ATTACHMENT_TYPE);
        expect(unifiedSO['cases-attachments'].metadata?.soType).to.be(FILE_SO_TYPE);
      });

      it('rejects a malformed legacy `.files` payload via the unified Zod schema', async () => {
        const postedCase = await createCase(supertest, caseRequest);
        const fileId = await seedFile(postedCase.id);

        const malformed = getFilesAttachmentReq({
          externalReferenceId: fileId,
          owner: SECURITY_SOLUTION_OWNER,
          externalReferenceMetadata: {
            files: [
              {
                name: 'no_mime_type',
                extension: 'txt',
                created: '2025-01-01T00:00:00.000Z',
              } as unknown as ReturnType<typeof fileMetadata>,
            ],
          },
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: malformed,
          expectedHttpCode: 400,
        });
      });

      it('rejects a unified `file` payload with an extra unknown field', async () => {
        const postedCase = await createCase(supertest, caseRequest);
        const fileId = await seedFile(postedCase.id);

        const malformed = {
          type: FILE_ATTACHMENT_TYPE,
          attachmentId: fileId,
          owner: SECURITY_SOLUTION_OWNER,
          metadata: {
            soType: FILE_SO_TYPE,
            files: [fileMetadata()],
            extraField: 'nope',
          },
        } as unknown as AttachmentRequest;

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: malformed,
          expectedHttpCode: 400,
        });
      });
    });

    describe('mixed legacy + unified file rows', () => {
      it('case totals reflect the file + comment counts (unified file does NOT inflate totalComment)', async () => {
        const postedCase = await createCase(supertest, caseRequest);

        await createFileAttachment({
          supertest,
          caseId: postedCase.id,
          params: postFileReq,
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'a comment alongside the file' },
              owner: SECURITY_SOLUTION_OWNER,
            },
          ],
        });

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        // The user comment counts toward `totalComment`; files are counted
        // separately via `totalAttachments` (or surfaced through the file
        // attachment listing endpoint).
        expect(refreshedCase.totalComment).to.be(1);
      });
    });
  });
};
