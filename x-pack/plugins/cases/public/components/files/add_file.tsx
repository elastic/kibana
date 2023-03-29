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

import type { Owner } from '../../../common/constants/types';

import { CommentType, ExternalReferenceStorageType } from '../../../common';
import { FILE_ATTACHMENT_TYPE } from '../../../common/api';
import { constructFileKindIdByOwner } from '../../../common/constants';
import { useCasesToast } from '../../common/use_cases_toast';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from './translations';
import { useRefreshCaseViewPage } from '../case_view/use_on_refresh_case_view_page';

interface AddFileProps {
  caseId: string;
}

const AddFileComponent: React.FC<AddFileProps> = ({ caseId }) => {
  const { owner, permissions } = useCasesContext();
  const { client: filesClient } = useFilesContext();
  const { showDangerToast, showErrorToast, showSuccessToast } = useCasesToast();
  const { isLoading, createAttachments } = useCreateAttachments();
  const refreshAttachmentsTable = useRefreshCaseViewPage();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  const onError = useCallback(
    (error) => {
      showErrorToast(error, {
        title: i18n.FAILED_UPLOAD,
      });
    },
    [showErrorToast]
  );

  const onUploadDone = useCallback(
    async (chosenFiles: UploadedFile[]) => {
      if (chosenFiles.length === 0) {
        showDangerToast(i18n.FAILED_UPLOAD);
        return;
      }

      const file = chosenFiles[0];

      try {
        await createAttachments({
          caseId,
          caseOwner: owner[0],
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
                    created: file.fileJSON.created,
                  },
                ],
              },
            },
          ],
          updateCase: refreshAttachmentsTable,
          throwOnError: true,
        });

        showSuccessToast(i18n.SUCCESSFUL_UPLOAD_FILE_NAME(file.fileJSON.name));
      } catch (error) {
        // error toast is handled inside  createAttachments

        // we need to delete the file if attachment creation failed
        await filesClient.delete({
          kind: constructFileKindIdByOwner(owner[0] as Owner),
          id: file.id,
        });
      }

      closeModal();
    },
    [
      caseId,
      createAttachments,
      filesClient,
      owner,
      refreshAttachmentsTable,
      showDangerToast,
      showSuccessToast,
    ]
  );

  return (
    <>
      <EuiButton
        data-test-subj="cases-files-add"
        iconType="plusInCircle"
        isDisabled={isLoading || !permissions.create}
        isLoading={isLoading}
        onClick={showModal}
      >
        {i18n.ADD_FILE}
      </EuiButton>
      {isModalVisible && (
        <EuiModal data-test-subj="cases-files-add-modal" onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{i18n.ADD_FILE}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <FileUpload
              kind={constructFileKindIdByOwner(owner[0] as Owner)}
              onDone={onUploadDone}
              onError={onError}
              meta={{ caseId, owner: owner[0] }}
            />
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
};
AddFileComponent.displayName = 'AddFile';

export const AddFile = React.memo(AddFileComponent);
