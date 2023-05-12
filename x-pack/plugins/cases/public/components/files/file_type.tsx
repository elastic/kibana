/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Suspense, lazy } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';
import type {
  ExternalReferenceAttachmentType,
  ExternalReferenceAttachmentViewProps,
} from '../../client/attachment_framework/types';

import { AttachmentActionType } from '../../client/attachment_framework/types';
import { FILE_ATTACHMENT_TYPE } from '../../../common/api';
import * as i18n from './translations';
import { isImage, isValidFileExternalReferenceMetadata } from './utils';

const FileAttachmentEvent = lazy(() =>
  import('./file_attachment_event').then((module) => ({ default: module.FileAttachmentEvent }))
);
const FileDeleteButton = lazy(() =>
  import('./file_delete_button').then((module) => ({ default: module.FileDeleteButton }))
);
const FileDownloadButton = lazy(() =>
  import('./file_download_button').then((module) => ({ default: module.FileDownloadButton }))
);

function getFileDownloadButton(fileId: string) {
  return <FileDownloadButton fileId={fileId} isIcon={false} />;
}

function getFileDeleteButton(caseId: string, fileId: string) {
  return <FileDeleteButton caseId={caseId} fileId={fileId} isIcon={false} />;
}

const getFileAttachmentActions = ({ caseId, fileId }: { caseId: string; fileId: string }) => [
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getFileDownloadButton(fileId),
    label: i18n.DOWNLOAD_FILE,
    isPrimary: false,
  },
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getFileDeleteButton(caseId, fileId),
    label: i18n.DELETE_FILE,
    isPrimary: false,
  },
];

const getFileAttachmentViewObject = (props: ExternalReferenceAttachmentViewProps) => {
  const caseId = props.caseData.id;
  const fileId = props.externalReferenceId;

  if (!isValidFileExternalReferenceMetadata(props.externalReferenceMetadata)) {
    return {
      type: 'regular',
      event: i18n.ADDED_UNKNOWN_FILE,
      timelineAvatar: 'document',
      getActions: () => [
        {
          type: AttachmentActionType.CUSTOM as const,
          render: () => getFileDeleteButton(caseId, fileId),
          label: i18n.DELETE_FILE,
          isPrimary: false,
        },
      ],
      hideDefaultActions: true,
    };
  }

  const fileMetadata = props.externalReferenceMetadata.files[0];
  const file = {
    id: fileId,
    ...fileMetadata,
  };

  return {
    event: (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <FileAttachmentEvent file={file} />
      </Suspense>
    ),
    timelineAvatar: isImage(file) ? 'image' : 'document',
    getActions: () => getFileAttachmentActions({ caseId, fileId }),
    hideDefaultActions: true,
  };
};

export const getFileType = (): ExternalReferenceAttachmentType => ({
  id: FILE_ATTACHMENT_TYPE,
  icon: 'document',
  displayName: 'File Attachment Type',
  getAttachmentViewObject: getFileAttachmentViewObject,
  getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_FILE }),
});
