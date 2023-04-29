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

export const createFileHandler = (
  filesClient: BaseFilesClient,
  owner: Owner
): EuiMarkdownDropHandler => ({
  supportedFiles: ['.png'],
  accepts: (itemType) => itemType === 'image/png',
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
          const src = filesClient.getDownloadHref({
            id: files?.[0].id ?? '',
            fileKind: constructFileKindIdByOwner(owner[0] as Owner),
          });

          resolve({ text: `![${item.name}](${src})`, config: { block: true } });
        });

        uploadState.error$.subscribe((error) => {
          if (error) {
            reject(error);
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
