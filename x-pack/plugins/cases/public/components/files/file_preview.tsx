/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import styled from 'styled-components';

import type { FileJSON } from '@kbn/shared-ux-file-types';

import { EuiOverlayMask, EuiFocusTrap, EuiImage, keys } from '@elastic/eui';
import { useFilesContext } from '@kbn/shared-ux-file-context';

import type { Owner } from '../../../common/constants/types';

import { constructFileKindIdByOwner } from '../../../common/files';
import { useCasesContext } from '../cases_context/use_cases_context';

interface FilePreviewProps {
  closePreview: () => void;
  selectedFile: Pick<FileJSON, 'id' | 'name'>;
}

const StyledOverlayMask = styled(EuiOverlayMask)`
  padding-block-end: 0vh !important;

  img {
    max-height: 85vh;
    max-width: 85vw;
    object-fit: contain;
  }
`;

export const FilePreview = ({ closePreview, selectedFile }: FilePreviewProps) => {
  const { client: filesClient } = useFilesContext();
  const { owner } = useCasesContext();

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (event.key === keys.ESCAPE || event.code === 'Escape') {
        closePreview();
      }
    };

    window.addEventListener('keyup', keyboardListener);

    return () => {
      window.removeEventListener('keyup', keyboardListener);
    };
  }, [closePreview]);

  return (
    <StyledOverlayMask>
      <EuiFocusTrap onClickOutside={closePreview}>
        <EuiImage
          alt={selectedFile.name}
          size="original"
          src={filesClient.getDownloadHref({
            id: selectedFile.id,
            fileKind: constructFileKindIdByOwner(owner[0] as Owner),
          })}
          data-test-subj="cases-files-image-preview"
        />
      </EuiFocusTrap>
    </StyledOverlayMask>
  );
};

FilePreview.displayName = 'FilePreview';
