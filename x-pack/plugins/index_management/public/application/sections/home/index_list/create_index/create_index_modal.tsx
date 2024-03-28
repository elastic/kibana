/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { createIndex } from '../../../../services';
import { notificationService } from '../../../../services/notification';

import { isValidIndexName } from './utils';

const INVALID_INDEX_NAME_ERROR = i18n.translate(
  'xpack.idxMgmt.createIndex.modal.invalidName.error',
  { defaultMessage: 'Index name is not valid' }
);

export interface CreateIndexModalProps {
  closeModal: () => void;
  loadIndices: () => void;
}

export const CreateIndexModal = ({ closeModal, loadIndices }: CreateIndexModalProps) => {
  const [indexName, setIndexName] = useState<string>('');
  const [indexNameError, setIndexNameError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | undefined>();

  const putCreateIndex = useCallback(async () => {
    setIsSaving(true);
    try {
      const { error } = await createIndex(indexName);
      setIsSaving(false);
      if (!error) {
        notificationService.showSuccessToast(
          i18n.translate('xpack.idxMgmt.createIndex.successfullyCreatedIndexMessage', {
            defaultMessage: 'Successfully created index: {indexName}',
            values: { indexName },
          })
        );
        closeModal();
        loadIndices();
        return;
      }
      setCreateError(error.message);
    } catch (e) {
      setIsSaving(false);
      setCreateError(e.message);
    }
  }, [closeModal, indexName, loadIndices]);

  const onSave = () => {
    if (isValidIndexName(indexName)) {
      putCreateIndex();
    }
  };

  const onNameChange = (name: string) => {
    setIndexName(name);
    if (!isValidIndexName(name)) {
      setIndexNameError(INVALID_INDEX_NAME_ERROR);
    } else if (indexNameError) {
      setIndexNameError(undefined);
    }
  };

  return (
    <EuiModal onClose={closeModal} initialFocus="[name=indexName]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.idxMgmt.createIndex.modal.title"
            defaultMessage="Create index"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {createError && (
          <>
            <EuiCallOut
              color="danger"
              iconType="error"
              title={i18n.translate('xpack.idxMgmt.createIndex.modal.error.title', {
                defaultMessage: 'Error creating index',
              })}
            >
              <EuiText>
                <FormattedMessage
                  id="xpack.idxMgmt.createIndex.modal.error.description"
                  defaultMessage="Error creating index: {errorMessage}"
                  values={{ errorMessage: createError }}
                />
              </EuiText>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        <EuiForm id="createIndexModalForm" component="form">
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.idxMgmt.createIndex.modal.indexName.label', {
              defaultMessage: 'Index name',
            })}
            isDisabled={isSaving}
            isInvalid={indexNameError !== undefined}
            error={indexNameError}
          >
            <EuiFieldText
              fullWidth
              name="indexName"
              value={indexName}
              onChange={(e) => onNameChange(e.target.value)}
              data-test-subj="createIndexNameFieldText"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={closeModal}
          disabled={isSaving}
          data-test-subj="createIndexCancelButton"
          data-telemetry-id="idxMgmt-indexList-createIndex-cancelButton"
        >
          <FormattedMessage
            id="xpack.idxMgmt.createIndex.modal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          fill
          disabled={indexNameError !== undefined}
          isLoading={isSaving}
          type="submit"
          onClick={onSave}
          form="createIndexModalForm"
          data-test-subj="createIndexSaveButton"
          data-telemetry-id="idxMgmt-indexList-createIndex-saveButton"
        >
          <FormattedMessage
            id="xpack.idxMgmt.createIndex.modal.saveButton"
            defaultMessage="Create"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
