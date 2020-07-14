/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  // @ts-ignore no-exported-member
  EuiFilePicker,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import {
  ImportDataResponse,
  ImportDataProps,
} from '../../../detections/containers/detection_engine/rules';
import {
  displayErrorToast,
  displaySuccessToast,
  useStateToaster,
  errorToToaster,
} from '../toasters';
import * as i18n from './translations';

interface ImportDataModalProps {
  checkBoxLabel: string;
  closeModal: () => void;
  description: string;
  errorMessage: string;
  failedDetailed: (id: string, statusCode: number, message: string) => string;
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
  const [, dispatchToaster] = useStateToaster();

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

        // TODO: Improve error toast details for better debugging failed imports
        // e.g. When success == true && success_count === 0 that means no rules were overwritten, etc
        if (importResponse.success) {
          displaySuccessToast(successMessage(importResponse.success_count), dispatchToaster);
        }
        if (importResponse.errors.length > 0) {
          const formattedErrors = importResponse.errors.map((e) =>
            failedDetailed(e.rule_id, e.error.status_code, e.error.message)
          );
          displayErrorToast(errorMessage, formattedErrors, dispatchToaster);
        }

        importComplete();
        cleanupAndCloseModal();
      } catch (error) {
        cleanupAndCloseModal();
        errorToToaster({ title: errorMessage, error, dispatchToaster });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles, overwrite]);

  const handleCloseModal = useCallback(() => {
    setSelectedFiles(null);
    closeModal();
  }, [closeModal]);

  return (
    <>
      {showModal && (
        <EuiOverlayMask>
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
        </EuiOverlayMask>
      )}
    </>
  );
};

ImportDataModalComponent.displayName = 'ImportDataModalComponent';

export const ImportDataModal = React.memo(ImportDataModalComponent);

ImportDataModal.displayName = 'ImportDataModal';
