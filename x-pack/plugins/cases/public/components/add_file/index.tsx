/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FilePicker } from '@kbn/shared-ux-file-picker';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import { CommentType, ExternalReferenceStorageType } from '../../../common';
import type { Case } from '../../../common';
import { CASES_FILE_KIND } from '../../../common/constants';

import { useCreateAttachments } from '../../containers/use_create_attachments';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from './translations';
import { useKibana } from '../../common/lib/kibana';

interface AddFileProps {
  caseId: string;
  onFileAdded: (newCase: Case) => void;
}

const AddFileComponent: React.FC<AddFileProps> = ({ caseId, onFileAdded }) => {
  const { notifications } = useKibana().services;

  const { owner } = useCasesContext();
  const { isLoading, createAttachments } = useCreateAttachments();

  const [showFilePickerModal, setShowFilePickerModal] = useState(false);

  const onAddFile = useCallback(() => {
    setShowFilePickerModal(true);
  }, []);

  const onClosePicker = useCallback(() => {
    setShowFilePickerModal(false);
  }, []);

  const onPickerFinished = useCallback(
    async (chosenFiles: FileJSON[]) => {
      const ids = chosenFiles.map((f) => f.id);

      notifications.toasts.addSuccess({
        title: 'Selected files!',
        text: `IDS: ${JSON.stringify(ids, null, 2)}`,
      });

      createAttachments({
        caseId,
        caseOwner: owner[0],
        data: [
          {
            type: CommentType.externalReference,
            externalReferenceId: ids[0],
            externalReferenceStorage: {
              type: ExternalReferenceStorageType.elasticSearchDoc,
            },
            externalReferenceAttachmentTypeId: '.files',
            externalReferenceMetadata: {
              name: chosenFiles[0].name,
            },
          },
        ],
        updateCase: onFileAdded,
      });

      setShowFilePickerModal(false);
    },
    [caseId, createAttachments, notifications.toasts, onFileAdded, owner]
  );

  const onUpload = useCallback(() => {
    notifications.toasts.addSuccess({
      title: 'Uploaded files',
    });
  }, [notifications.toasts]);

  return (
    <>
      <EuiButton
        data-test-subj="cases-add-file"
        fill
        iconType="plusInCircle"
        isDisabled={isLoading}
        isLoading={isLoading}
        onClick={onAddFile}
      >
        {i18n.ADD_FILE}
      </EuiButton>
      {showFilePickerModal && (
        <FilePicker
          kind={CASES_FILE_KIND.id}
          onClose={onClosePicker}
          onDone={onPickerFinished}
          onUpload={onUpload}
          multiple
          pageSize={50}
        />
      )}
    </>
  );
};
AddFileComponent.displayName = 'AddFile';

export const AddFile = React.memo(AddFileComponent);
