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

import type {
  ImportDataResponse,
  ImportDataProps,
} from '../../../detection_engine/rule_management/logic';
import { useAppToasts } from '../../hooks/use_app_toasts';
import * as i18n from './translations';
import { showToasterMessage } from './utils';

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
// TODO split into two: timelines and rules
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

  const cleanupAndCloseModal = useCallback(() => {
    setIsImporting(false);
    setSelectedFiles(null);
    closeModal();
    setOverwrite(false);
    setOverwriteExceptions(false);
  }, [setIsImporting, setSelectedFiles, closeModal, setOverwrite, setOverwriteExceptions]);

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

        showToasterMessage({
          importResponse,
          exceptionsIncluded: showExceptionsCheckBox,
          successMessage,
          errorMessage,
          errorMessageDetailed: failedDetailed,
          addError,
          addSuccess,
        });

        importComplete();
        cleanupAndCloseModal();
      } catch (error) {
        cleanupAndCloseModal();
        addError(error, { title: errorMessage(1) });
      }
    }
  }, [
    selectedFiles,
    importData,
    overwrite,
    overwriteExceptions,
    showExceptionsCheckBox,
    successMessage,
    errorMessage,
    failedDetailed,
    addError,
    addSuccess,
    importComplete,
    cleanupAndCloseModal,
  ]);

  const handleCloseModal = useCallback(() => {
    cleanupAndCloseModal();
  }, [cleanupAndCloseModal]);

  const handleCheckboxClick = useCallback(() => {
    setOverwrite((shouldOverwrite) => !shouldOverwrite);
  }, []);

  const handleExceptionsCheckboxClick = useCallback(() => {
    setOverwriteExceptions((shouldOverwrite) => !shouldOverwrite);
  }, []);

  return (
    <>
      {showModal && (
        <EuiModal onClose={handleCloseModal} maxWidth={'750px'}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText size="s">
              <h4>{description}</h4>
            </EuiText>

            <EuiSpacer size="s" />
            <EuiFilePicker
              data-test-subj="rule-file-picker"
              accept=".ndjson"
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
                  data-test-subj="import-data-modal-checkbox-label"
                  id="import-data-modal-checkbox-label"
                  label={checkBoxLabel}
                  checked={overwrite}
                  onChange={handleCheckboxClick}
                />
                {showExceptionsCheckBox && (
                  <EuiCheckbox
                    data-test-subj="import-data-modal-exceptions-checkbox-label"
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
