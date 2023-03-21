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
import { useQueryClient } from '@tanstack/react-query';

import { APP_ID, CommentType, ExternalReferenceStorageType } from '../../../common';
import { FILE_ATTACHMENT_TYPE } from '../../../common/api';
import { useKibana } from '../../common/lib/kibana';
import { casesQueriesKeys } from '../../containers/constants';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { CASES_FILE_KINDS } from '../../files';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from './translations';

interface AddFileProps {
  caseId: string;
}

const AddFileComponent: React.FC<AddFileProps> = ({ caseId }) => {
  const { owner } = useCasesContext();
  const { client: filesClient } = useFilesContext();
  const { notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const { isLoading, createAttachments } = useCreateAttachments();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  const refreshAttachmentsTable = useCallback(() => {
    queryClient.invalidateQueries(casesQueriesKeys.caseView());
  }, [queryClient]);

  const onError = useCallback(
    (error) => {
      notifications.toasts.addError(error, {
        title: i18n.FAILED_UPLOAD,
      });
    },
    [notifications.toasts]
  );

  const onUploadDone = useCallback(
    async (chosenFiles: UploadedFile[]) => {
      if (chosenFiles.length === 0) {
        notifications.toasts.addDanger({
          title: i18n.FAILED_UPLOAD,
        });
      } else {
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
                      createdAt: file.fileJSON.created,
                    },
                  ],
                },
              },
            ],
            updateCase: refreshAttachmentsTable,
            throwOnError: true,
          });

          notifications.toasts.addSuccess({
            title: i18n.SUCCESSFUL_UPLOAD,
            text: i18n.SUCCESSFUL_UPLOAD_FILE_NAME(file.fileJSON.name),
          });
        } catch (error) {
          // error toast is handled inside  createAttachments

          // we need to delete the file if attachment creation failed
          await filesClient.delete({ kind: CASES_FILE_KINDS[APP_ID].id, id: file.id });
        }
      }

      closeModal();
    },
    [caseId, createAttachments, filesClient, notifications.toasts, refreshAttachmentsTable, owner]
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
