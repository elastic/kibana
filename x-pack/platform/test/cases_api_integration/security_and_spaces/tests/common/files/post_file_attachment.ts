/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  FILE_ATTACHMENT_TYPE,
  LEGACY_FILE_ATTACHMENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '@kbn/cases-plugin/common/constants';
import { constructFileKindIdByOwner } from '@kbn/cases-plugin/common/files';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import type { AttachmentRequest } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  fileMetadata,
  getFilesAttachmentReq,
  getPostCaseRequest,
} from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  createFile,
  deleteAllCaseItems,
  deleteAllFiles,
  getComment,
} from '../../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  // The flag-OFF tests live in the default cases API; we use the real
  // `securitySolution` owner because the test fixture plugin does not
  // register file kinds.
  const caseRequest = getPostCaseRequest({ owner: SECURITY_SOLUTION_OWNER });
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

  describe('post_file_attachment via POST /:caseId/comments', () => {
    afterEach(async () => {
      await deleteAllFiles({ supertest });
      await deleteAllCaseItems(es);
    });

    describe('legacy `.files` payload', () => {
      it('persists the legacy externalReference shape and round-trips on read', async () => {
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

        const fileComment = patchedCase.comments![0] as unknown as {
          id: string;
          type: string;
          externalReferenceId: string;
          externalReferenceAttachmentTypeId: string;
          externalReferenceStorage: { type: string; soType?: string };
        };

        expect(fileComment.type).to.be('externalReference');
        expect(fileComment.externalReferenceId).to.be(fileId);
        expect(fileComment.externalReferenceAttachmentTypeId).to.be(LEGACY_FILE_ATTACHMENT_TYPE);
        expect(fileComment.externalReferenceStorage.type).to.be('savedObject');
        expect(fileComment.externalReferenceStorage.soType).to.be(FILE_SO_TYPE);

        const fetched = (await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: fileComment.id,
        })) as unknown as typeof fileComment;
        expect(fetched.type).to.be('externalReference');
        expect(fetched.externalReferenceAttachmentTypeId).to.be(LEGACY_FILE_ATTACHMENT_TYPE);
      });

      it('rejects a malformed `.files` payload via the unified Zod schema', async () => {
        const postedCase = await createCase(supertest, caseRequest);
        const fileId = await seedFile(postedCase.id);

        // Missing required `mimeType` on the single file entry. The legacy
        // shape passes the route-level schema but is rejected when we
        // transform it into the unified payload and re-validate.
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

      it('rejects a `.files` payload with zero file entries', async () => {
        const postedCase = await createCase(supertest, caseRequest);
        const fileId = await seedFile(postedCase.id);

        const empty = getFilesAttachmentReq({
          externalReferenceId: fileId,
          owner: SECURITY_SOLUTION_OWNER,
          externalReferenceMetadata: { files: [] as unknown as [ReturnType<typeof fileMetadata>] },
        });

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: empty,
          expectedHttpCode: 400,
        });
      });
    });

    describe('unified `file` payload', () => {
      it('accepts the unified shape and projects back to legacy on read', async () => {
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
          externalReferenceId: string;
          externalReferenceAttachmentTypeId: string;
          externalReferenceStorage: { type: string; soType?: string };
        };

        // With the flag OFF the API always projects back to the legacy
        // externalReference shape, regardless of how it was created.
        expect(fileComment.type).to.be('externalReference');
        expect(fileComment.externalReferenceId).to.be(fileId);
        expect(fileComment.externalReferenceAttachmentTypeId).to.be(LEGACY_FILE_ATTACHMENT_TYPE);
        expect(fileComment.externalReferenceStorage.soType).to.be(FILE_SO_TYPE);

        const fetched = (await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: fileComment.id,
        })) as unknown as typeof fileComment;
        expect(fetched.type).to.be('externalReference');
        expect(fetched.externalReferenceAttachmentTypeId).to.be(LEGACY_FILE_ATTACHMENT_TYPE);
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
  });
};
