/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonIcon } from '@elastic/eui';
import * as i18n from './translations';
import { useDeleteFileAttachment } from '../../containers/use_delete_file_attachment';

interface FileDeleteButtonIconProps {
  caseId: string;
  fileId: string;
}

const FileDeleteButtonIconComponent: React.FC<FileDeleteButtonIconProps> = ({ caseId, fileId }) => {
  const { isLoading, mutate: deleteFileAttachment } = useDeleteFileAttachment();

  return (
    <EuiButtonIcon
      iconType={'trash'}
      aria-label={i18n.DELETE_FILE}
      color={'danger'}
      isDisabled={isLoading}
      onClick={() =>
        deleteFileAttachment({ caseId, fileId, successToasterTitle: i18n.FILE_DELETE_SUCCESS })
      }
      data-test-subj={'cases-files-delete-button'}
    />
  );
};
FileDeleteButtonIconComponent.displayName = 'FileDeleteButtonIcon';

export const FileDeleteButtonIcon = React.memo(FileDeleteButtonIconComponent);
