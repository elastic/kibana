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
  showModal,
  submitBtnText,
  subtitle,
  successMessage,
  title,
}: ImportDataModalProps) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const { addError, addSuccess } = useAppToasts();

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
          signal: abortCtrl.signal,
        });

        if (importResponse.success) {
          addSuccess(successMessage(importResponse.success_count));
        }
        if (importResponse.errors.length > 0) {
          const formattedErrors = importResponse.errors.map((e) => failedDetailed(e.error.message));
          const error: Error & { raw_network_error?: object } = new Error(
            formattedErrors.join('. ')
          );
          error.stack = undefined;
          error.name = 'Network errors';
          error.raw_network_error = importResponse;
          addError(error, { title: errorMessage(importResponse.errors.length) });
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
    addError,
    addSuccess,
    cleanupAndCloseModal,
    errorMessage,
    failedDetailed,
    importComplete,
    importData,
    successMessage,
  ]);

  const handleCloseModal = useCallback(() => {
    setSelectedFiles(null);
    closeModal();
  }, [closeModal]);

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
              data-test-subj="importFilePicker"
            />
            <EuiSpacer size="s" />
            {showCheckBox && (
              <EuiCheckbox
                id="import-data-modal-checkbox-label"
                label={checkBoxLabel}
                checked={overwrite}
                onChange={() => setOverwrite(!overwrite)}
              />
            )}
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={handleCloseModal}>{i18n.CANCEL_BUTTON}</EuiButtonEmpty>
            <EuiButton
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
