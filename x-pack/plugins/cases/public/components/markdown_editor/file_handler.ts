/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiMarkdownDropHandler } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import type { BaseFilesClient } from '@kbn/shared-ux-file-types';
import { createUploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { constructFileKindIdByOwner } from '../../../common/files';
import type { Owner } from '../../../common/constants/types';
import { ERROR_FILE_UPLOAD, IMAGES } from './translations';

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
}: {
  filesClient: BaseFilesClient;
  owner: Owner;
  domain: string;
}): EuiMarkdownDropHandler => ({
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
          const fileHref = filesClient.getDownloadHref({
            id: files?.[0].id ?? '',
            fileKind: kindId,
          });

          const src = `${domain}${fileHref}`;

          resolve({ text: `![${item.name}](${src})`, config: { block: true } });
        });

        uploadState.error$.subscribe((error) => {
          if (error) {
            reject(new Error(`${ERROR_FILE_UPLOAD}. Error: ${error.message}`));
          }
        });

        uploadState.setFiles([item]);
        uploadState.upload();
      } catch (error) {
        reject(error);
      }
    });
  },
});
