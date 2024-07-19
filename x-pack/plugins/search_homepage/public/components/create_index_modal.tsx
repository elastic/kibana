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
import { useQueryClient } from '@tanstack/react-query';

import { useKibana } from '../hooks/use_kibana';
import { useCreateIndex } from '../hooks/api/use_create_index';
import { getErrorMessage } from '../utils/get_error_message';
import { isValidIndexName } from '../utils/is_valid_index_name';
import { QueryKeys } from '../constants';

const INVALID_INDEX_NAME_ERROR = i18n.translate(
  'xpack.searchHomepage.createIndex.modal.invalidName.error',
  { defaultMessage: 'Index name is not valid' }
);

export interface CreateIndexModalProps {
  closeModal: () => void;
}

export const CreateIndexModal = ({ closeModal }: CreateIndexModalProps) => {
  const queryClient = useQueryClient();
  const { notifications } = useKibana().services;
  const { mutateAsync: createIndex } = useCreateIndex();
  const [indexName, setIndexName] = useState<string>('');
  const [indexNameError, setIndexNameError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | undefined>(undefined);

  const putCreateIndex = useCallback(async () => {
    setIsSaving(true);
    try {
      await createIndex(indexName);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.searchHomepage.createIndex.successfullyCreatedIndexMessage', {
          defaultMessage: 'Successfully created index: {indexName}',
          values: { indexName },
        }),
        'success'
      );
      closeModal();
      queryClient.invalidateQueries({ queryKey: [QueryKeys.FetchIndices] });
    } catch (error) {
      setCreateError(
        getErrorMessage(
          error,
          i18n.translate('xpack.searchHomepage.createIndex.error.fallbackMessage', {
            defaultMessage: 'Unknown error creating index.',
          })
        )
      );
    } finally {
      setIsSaving(false);
    }
  }, [createIndex, closeModal, indexName, queryClient, notifications]);

  const onSave = () => {
    if (isValidIndexName(indexName)) {
      putCreateIndex().catch(() => {});
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
            id="xpack.searchHomepage.createIndex.modal.title"
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
              title={i18n.translate('xpack.searchHomepage.createIndex.modal.error.title', {
                defaultMessage: 'Error creating index',
              })}
            >
              <EuiText>
                <FormattedMessage
                  id="xpack.searchHomepage.createIndex.modal.error.description"
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
            label={i18n.translate('xpack.searchHomepage.createIndex.modal.indexName.label', {
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
            id="xpack.searchHomepage.createIndex.modal.cancelButton"
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
            id="xpack.searchHomepage.createIndex.modal.saveButton"
            defaultMessage="Create"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
