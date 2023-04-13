/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type {
  ExternalReferenceAttachmentType,
  ExternalReferenceAttachmentViewProps,
} from '../../client/attachment_framework/types';
import type { DownloadableFile } from './types';

import { AttachmentActionType } from '../../client/attachment_framework/types';
import { FILE_ATTACHMENT_TYPE } from '../../../common/api';
import { FileDownloadButtonIcon } from './file_download_button_icon';
import { FileNameLink } from './file_name_link';
import { FilePreview } from './file_preview';
import * as i18n from './translations';
import { isImage, isValidFileExternalReferenceMetadata } from './utils';
import { useFilePreview } from './use_file_preview';
import { FileDeleteButtonIcon } from './file_delete_button_icon';

interface FileAttachmentEventProps {
  file: DownloadableFile;
}

const FileAttachmentEvent = ({ file }: FileAttachmentEventProps) => {
  const { isPreviewVisible, showPreview, closePreview } = useFilePreview();

  return (
    <>
      {i18n.ADDED}
      <FileNameLink file={file} showPreview={showPreview} />
      {isPreviewVisible && <FilePreview closePreview={closePreview} selectedFile={file} />}
    </>
  );
};

FileAttachmentEvent.displayName = 'FileAttachmentEvent';

function getFileDownloadButtonIcon(fileId: string) {
  return <FileDownloadButtonIcon fileId={fileId} />;
}

function getFileDeleteButtonIcon(caseId: string, fileId: string) {
  return <FileDeleteButtonIcon caseId={caseId} fileId={fileId} />;
}

const getFileAttachmentActions = ({ caseId, fileId }: { caseId: string; fileId: string }) => [
  {
    type: AttachmentActionType.CUSTOM as const,
    isPrimary: true,
    render: () => getFileDownloadButtonIcon(fileId),
    label: i18n.DOWNLOAD_FILE,
  },
  {
    type: AttachmentActionType.CUSTOM as const,
    isPrimary: true,
    render: () => getFileDeleteButtonIcon(caseId, fileId),
    label: i18n.DELETE_FILE,
  },
];

const getFileAttachmentViewObject = (props: ExternalReferenceAttachmentViewProps) => {
  if (!isValidFileExternalReferenceMetadata(props.externalReferenceMetadata)) {
    return {
      type: 'regular',
      event: i18n.ADDED_UNKNOWN_FILE,
      timelineAvatar: 'document',
      hideDefaultActions: true,
    };
  }

  const fileId = props.externalReferenceId;
  const caseId = props.caseData.id;

  const fileMetadata = props.externalReferenceMetadata.files[0];
  const file = {
    id: fileId,
    ...fileMetadata,
  };

  return {
    event: <FileAttachmentEvent file={file} />,
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
  hideDefaultActions: true,
});
