/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFilePicker,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import {
  ImportDataResponse,
  ImportDataProps,
  ImportResponseError,
  ImportRulesResponseError,
  ExceptionsImportError,
} from '../../../detections/containers/detection_engine/rules';
import { useAppToasts } from '../../hooks/use_app_toasts';
import * as i18n from './translations';

interface ImportDataModalProps {
  checkBoxLabel: string;
  closeModal: () => void;
  description: string;
  errorMessage: (totalCount: number) => string;
  failedDetailed: (message: string) => string;
  importComplete: () => void;
  importData: (arg: ImportDataProps) => Promise<ImportDataResponse>;
  showCheckBox: boolean;
  showExceptionsCheckBox?: boolean;
  showModal: boolean;
  submitBtnText: string;
  subtitle: string;
  successMessage: (totalCount: number) => string;
  title: string;
}

/**
 * Modal component for importing Rules from a json file
 */
export const ImportDataModalComponent = ({
  checkBoxLabel,
  closeModal,
  description,
  errorMessage,
  failedDetailed,
  importComplete,
  importData,
  showCheckBox = true,
  showExceptionsCheckBox = false,
  showModal,
  submitBtnText,
  subtitle,
  successMessage,
  title,
}: ImportDataModalProps) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [overwriteExceptions, setOverwriteExceptions] = useState(false);
  const { addError, addSuccess } = useAppToasts();

  const formatError = useCallback(
    (
      importResponse: ImportDataResponse,
      errors: Array<ImportRulesResponseError | ImportResponseError | ExceptionsImportError>
    ) => {
      const formattedErrors = errors.map((e) => failedDetailed(e.error.message));
      const error: Error & { raw_network_error?: object } = new Error(formattedErrors.join('. '));
      error.stack = undefined;
      error.name = 'Network errors';
      error.raw_network_error = importResponse;

      return error;
    },
    [failedDetailed]
  );

  const cleanupAndCloseModal = useCallback(() => {
    setIsImporting(false);
    setSelectedFiles(null);
    closeModal();
  }, [setIsImporting, setSelectedFiles, closeModal]);

  const importDataCallback = useCallback(async () => {
    if (selectedFiles != null) {
      setIsImporting(true);
      const abortCtrl = new AbortController();

      try {
        const importResponse = await importData({
          fileToImport: selectedFiles[0],
          overwrite,
          overwriteExceptions,
          signal: abortCtrl.signal,
        });

        // rules response actions
        if (importResponse.success) {
          addSuccess(successMessage(importResponse.success_count));
        }
        if (importResponse.errors.length > 0) {
          const error = formatError(importResponse, importResponse.errors);
          addError(error, { title: errorMessage(importResponse.errors.length) });
        }

        // if import includes exceptions
        if (showExceptionsCheckBox) {
          // exceptions response actions
          if (
            importResponse.exceptions_success &&
            importResponse.exceptions_success_count != null
          ) {
            addSuccess(
              i18n.SUCCESSFULLY_IMPORTED_EXCEPTIONS(importResponse.exceptions_success_count)
            );
          }

          if (
            importResponse.exceptions_errors != null &&
            importResponse.exceptions_errors.length > 0
          ) {
            const error = formatError(importResponse, importResponse.exceptions_errors);
            addError(error, { title: i18n.IMPORT_FAILED(importResponse.exceptions_errors.length) });
          }
        }

        importComplete();
        cleanupAndCloseModal();
      } catch (error) {
        cleanupAndCloseModal();
        addError(error, { title: errorMessage(1) });
      }
    }
  }, [
    selectedFiles,
    overwrite,
    overwriteExceptions,
    addError,
    addSuccess,
    cleanupAndCloseModal,
    errorMessage,
    importComplete,
    importData,
    successMessage,
    showExceptionsCheckBox,
    formatError,
  ]);

  const handleCloseModal = useCallback(() => {
    setSelectedFiles(null);
    closeModal();
  }, [closeModal]);

  const handleCheckboxClick = useCallback(() => {
    setOverwrite((shouldOverwrite) => !shouldOverwrite);
  }, []);

  const handleExceptionsCheckboxClick = useCallback(() => {
    setOverwriteExceptions((shouldOverwrite) => !shouldOverwrite);
  }, []);

  return (
    <>
      {showModal && (
        <EuiModal onClose={closeModal} maxWidth={'750px'}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText size="s">
              <h4>{description}</h4>
            </EuiText>

            <EuiSpacer size="s" />
            <EuiFilePicker
              id="rule-file-picker"
              initialPromptText={subtitle}
              onChange={(files: FileList | null) => {
                setSelectedFiles(files && files.length > 0 ? files : null);
              }}
              display={'large'}
              fullWidth={true}
              isLoading={isImporting}
            />
            <EuiSpacer size="s" />
            {showCheckBox && (
              <>
                <EuiCheckbox
                  id="import-data-modal-checkbox-label"
                  label={checkBoxLabel}
                  checked={overwrite}
                  onChange={handleCheckboxClick}
                />
                {showExceptionsCheckBox && (
                  <EuiCheckbox
                    id="import-data-modal-exceptions-checkbox-label"
                    label={i18n.OVERWRITE_EXCEPTIONS_LABEL}
                    checked={overwriteExceptions}
                    onChange={handleExceptionsCheckboxClick}
                  />
                )}
              </>
            )}
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={handleCloseModal}>{i18n.CANCEL_BUTTON}</EuiButtonEmpty>
            <EuiButton
              data-test-subj="import-data-modal-button"
              onClick={importDataCallback}
              disabled={selectedFiles == null || isImporting}
              fill
            >
              {submitBtnText}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

ImportDataModalComponent.displayName = 'ImportDataModalComponent';

export const ImportDataModal = React.memo(ImportDataModalComponent);

ImportDataModal.displayName = 'ImportDataModal';
