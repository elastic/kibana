/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { FileJSON } from '@kbn/shared-ux-file-types';

import {
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { FileImage } from '@kbn/shared-ux-file-image';

import { APP_ID } from '../../../common';
import { CASES_FILE_KINDS } from '../../files';
import * as i18n from './translations';
import { isImage } from './utils';

interface FilePreviewModalProps {
  closeModal: () => void;
  getDownloadHref: (args: Pick<FileJSON<unknown>, 'id' | 'fileKind'>) => string;
  selectedFile: FileJSON;
}

export const FilePreviewModal = ({
  closeModal,
  selectedFile,
  getDownloadHref,
}: FilePreviewModalProps) => {
  return (
    <EuiModal maxWidth={false} onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{selectedFile?.name}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {isImage(selectedFile) && (
          <FileImage
            size="fullWidth"
            alt=""
            src={getDownloadHref({
              id: selectedFile?.id || '',
              fileKind: CASES_FILE_KINDS[APP_ID].id,
            })}
          />
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton size="s" onClick={closeModal} fill>
          {i18n.CLOSE_MODAL}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

FilePreviewModal.displayName = 'FilePreviewModal';
