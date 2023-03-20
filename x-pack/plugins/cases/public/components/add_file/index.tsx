/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import type { UploadedFile } from '@kbn/shared-ux-file-upload/src/file_upload';

import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { FileUpload } from '@kbn/shared-ux-file-upload';
import { useFilesContext } from '@kbn/shared-ux-file-context';

import { APP_ID, CommentType, ExternalReferenceStorageType } from '../../../common';
import { FILE_ATTACHMENT_TYPE } from '../../../common/api';
import { CASES_FILE_KINDS } from '../../files';
import { useKibana } from '../../common/lib/kibana';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import * as i18n from './translations';

interface AddFileProps {
  caseId: string;
  onFileAdded: () => void;
  owner: string;
}

const AddFileComponent: React.FC<AddFileProps> = ({ caseId, onFileAdded, owner }) => {
  const { notifications } = useKibana().services;
  const { client: filesClient } = useFilesContext();

  const { isLoading, createAttachments } = useCreateAttachments();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  const onUploadDone = useCallback(
    async (chosenFiles: UploadedFile[]) => {
      const file = chosenFiles[0];

      try {
        await createAttachments({
          caseId,
          caseOwner: owner,
          data: [
            {
              type: CommentType.externalReference,
              externalReferenceId: file.id,
              externalReferenceStorage: {
                type: ExternalReferenceStorageType.savedObject,
                soType: FILE_SO_TYPE,
              },
              externalReferenceAttachmentTypeId: FILE_ATTACHMENT_TYPE,
              externalReferenceMetadata: {
                files: [
                  {
                    name: file.fileJSON.name,
                    extension: file.fileJSON.extension ?? '',
                    mimeType: file.fileJSON.mimeType ?? '',
                    createdAt: file.fileJSON.created,
                  },
                ],
              },
            },
          ],
          updateCase: onFileAdded,
          throwOnError: true,
        });

        notifications.toasts.addSuccess({
          title: i18n.SUCCESSFUL_UPLOAD,
          text: i18n.SUCCESSFUL_UPLOAD_FILE_NAME(file.fileJSON.name),
        });

        // used to refresh the attachments table
        onFileAdded();
      } catch (error) {
        // error toast is handled inside  createAttachments

        // we need to delete the file here
        await filesClient.delete({ kind: CASES_FILE_KINDS[APP_ID].id, id: file.id });
      }

      closeModal();
    },
    [caseId, createAttachments, filesClient, notifications.toasts, onFileAdded, owner]
  );

  const onError = useCallback(
    (error) => {
      notifications.toasts.addError(error, {
        title: i18n.FAILED_UPLOAD,
      });
    },
    [notifications.toasts]
  );

  return (
    <>
      <EuiButton
        data-test-subj="cases-add-file"
        iconType="plusInCircle"
        isDisabled={isLoading}
        isLoading={isLoading}
        onClick={showModal}
      >
        {i18n.ADD_FILE}
      </EuiButton>
      {isModalVisible && (
        <EuiModal onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{i18n.ADD_FILE}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <FileUpload
              kind={CASES_FILE_KINDS[APP_ID].id}
              onDone={onUploadDone}
              onError={onError}
              meta={{ caseId, owner }}
            />
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
};
AddFileComponent.displayName = 'AddFile';

export const AddFile = React.memo(AddFileComponent);
