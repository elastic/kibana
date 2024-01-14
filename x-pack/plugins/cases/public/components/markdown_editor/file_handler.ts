/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiMarkdownDropHandler } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import type { BaseFilesClient } from '@kbn/shared-ux-file-types';
import { createUploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { FILE_ATTACHMENT_TYPE } from '../../../common/constants';
import { AttachmentType, ExternalReferenceStorageType } from '../../../common';
import { constructFileKindIdByOwner } from '../../../common/files';
import type { Owner } from '../../../common/constants/types';
import { ERROR_FILE_UPLOAD, IMAGES } from './translations';
import type { UseCreateAttachments } from '../../containers/use_create_attachments';
import { deleteFileAttachments } from '../../containers/api';

/**
 * Most common image mime types.
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
 */
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/avif',
  'image/bmp',
];

export const createFileHandler = ({
  filesClient,
  owner,
  domain,
  caseId,
  createAttachments,
  onUploadFile,
}: {
  filesClient: BaseFilesClient;
  owner: Owner;
  domain: string;
  caseId: string;
  createAttachments: UseCreateAttachments['mutateAsync'];
  onUploadFile: (files: Array<{ type: string; url: string; id: string }>) => void;
}): EuiMarkdownDropHandler => ({
  /**
   * This is the message being shown in the
   * footer when the user selects an
   * unsupported file.
   */
  supportedFiles: [IMAGES],
  accepts: (itemType) => SUPPORTED_MIME_TYPES.includes(itemType),
  getFormattingForItem: (item) => {
    return new Promise((resolve, reject) => {
      try {
        const kindId = constructFileKindIdByOwner(owner);
        const fileKind = filesClient.getFileKind(kindId);
        const uploadState = createUploadState({
          client: filesClient,
          fileKind,
        });

        uploadState.done$.subscribe((files) => {
          if (files == null || files.length === 0) {
            reject(new Error(`${ERROR_FILE_UPLOAD}`));
            return;
          }

          const createAttachmentsReq = files.map((file) => ({
            type: AttachmentType.externalReference as const,
            externalReferenceId: file.id ?? '',
            externalReferenceStorage: {
              type: ExternalReferenceStorageType.savedObject as const,
              soType: FILE_SO_TYPE,
            },
            externalReferenceAttachmentTypeId: FILE_ATTACHMENT_TYPE,
            externalReferenceMetadata: {
              files: [
                {
                  name: file.fileJSON.name,
                  extension: file.fileJSON.extension ?? '',
                  mimeType: file.fileJSON.mimeType ?? '',
                  created: file.fileJSON.created,
                },
              ],
            },
          }));

          createAttachments({
            caseId,
            caseOwner: owner,
            attachments: createAttachmentsReq,
          })
            .then((_) => {
              const markDownText = files.map((file) => {
                const fileHref = filesClient.getDownloadHref({
                  id: file.id,
                  fileKind: kindId,
                });

                const src = `${domain}${fileHref}`;

                return `![${item.name}](${src})`;
              });

              onUploadFile(
                files.map((file) => ({
                  type: 'file',
                  url: filesClient.getDownloadHref({
                    id: file.id,
                    fileKind: kindId,
                  }),
                  id: file.id,
                }))
              );

              resolve({ text: markDownText.join('\n'), config: { block: true } });
            })
            .catch(async (error) => {
              deleteFileAttachments({ caseId, fileIds: files.map((file) => file.id) }).finally(
                () => {
                  reject(new Error(`${ERROR_FILE_UPLOAD}. Error: ${error.message}`));
                }
              );
            });
        });

        uploadState.error$.subscribe((error) => {
          if (error) {
            reject(new Error(`${ERROR_FILE_UPLOAD}. Error: ${error.message}`));
          }
        });

        uploadState.setFiles([item]);
        uploadState.upload({ caseIds: [caseId], owner: [owner] });
      } catch (error) {
        reject(error);
      }
    });
  },
});
