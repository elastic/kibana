/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { FileJSON } from '@kbn/shared-ux-file-types';

import type {
  ExternalReferenceAttachmentType,
  ExternalReferenceAttachmentViewProps,
} from '../../client/attachment_framework/types';

import { FILE_ATTACHMENT_TYPE } from '../../../common/api';
import { FileDownloadButtonIcon } from './file_download_button_icon';
import { FileNameLink } from './file_name_link';
import { FilePreview } from './file_preview';
import * as i18n from './translations';
import { isImage, isValidFileExternalReferenceMetadata } from './utils';
import { useFilePreview } from './use_file_preview';
import { FileDeleteButtonIcon } from './file_delete_button_icon';

interface FileAttachmentEventProps {
  file: FileJSON;
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

const FileAttachmentActions = ({ caseId, fileId }: { caseId: string; fileId: string }) => (
  <>
    <FileDownloadButtonIcon fileId={fileId} />
    <FileDeleteButtonIcon caseId={caseId} fileId={fileId} />
  </>
);

FileAttachmentActions.displayName = 'FileAttachmentActions';

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

  // @ts-ignore
  const partialFileJSON = props.externalReferenceMetadata?.files[0] as Partial<FileJSON>;

  const file = {
    id: fileId,
    ...partialFileJSON,
  } as FileJSON;

  return {
    event: <FileAttachmentEvent file={file} />,
    timelineAvatar: isImage(file) ? 'image' : 'document',
    actions: <FileAttachmentActions caseId={caseId} fileId={fileId} />,
    hideDefaultActions: true,
  };
};

export const getFileType = (): ExternalReferenceAttachmentType => ({
  id: FILE_ATTACHMENT_TYPE,
  icon: 'document',
  displayName: 'File Attachment Type',
  getAttachmentViewObject: getFileAttachmentViewObject,
});
