/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

import type { FileJSON } from '@kbn/shared-ux-file-types';

import { EuiOverlayMask, EuiFocusTrap, EuiImage } from '@elastic/eui';

import { APP_ID } from '../../../common';
import { CASES_FILE_KINDS } from '../../files';

interface FilePreviewProps {
  closePreview: () => void;
  getDownloadHref: (args: Pick<FileJSON<unknown>, 'id' | 'fileKind'>) => string;
  selectedFile: FileJSON;
}

const StyledOverlayMask = styled(EuiOverlayMask)`
  padding-block-end: 0vh !important;

  img {
    max-height: 85vh;
    max-width: 85vw;
    object-fit: contain;
  }
`;

export const FilePreview = ({ closePreview, selectedFile, getDownloadHref }: FilePreviewProps) => {
  return (
    <StyledOverlayMask>
      <EuiFocusTrap onClickOutside={closePreview}>
        <EuiImage
          alt={selectedFile.name}
          size="original"
          src={getDownloadHref({
            id: selectedFile.id || '',
            fileKind: CASES_FILE_KINDS[APP_ID].id,
          })}
        />
      </EuiFocusTrap>
    </StyledOverlayMask>
  );
};

FilePreview.displayName = 'FilePreview';
