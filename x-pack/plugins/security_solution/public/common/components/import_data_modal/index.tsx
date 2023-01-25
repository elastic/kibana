/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
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
import type { WarningSchema } from '../../../../common/detection_engine/schemas/response';

import type {
  ImportDataResponse,
  ImportDataProps,
} from '../../../detection_engine/rule_management/logic';
import { useAppToasts } from '../../hooks/use_app_toasts';
import * as i18n from './translations';
import { showToasterMessage } from './utils';
import { ActionConnectorWarnings } from './action_connectors_warning';

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
  showActionConnectorsCheckBox?: boolean;
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
  showActionConnectorsCheckBox = false,
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
  const [overwriteActionConnectors, setOverwriteActionConnectors] = useState(false);
  const { addError, addSuccess } = useAppToasts();
  // TODO Ask if we use schema on the FE
  const [actionConnectorsWarnings, setActionConnectorsWarnings] = useState<WarningSchema[] | []>(
    []
  );
  const [importedActionConnectorsCount, setImportedActionConnectorsCount] = useState<
    number | undefined
  >(0);
  const cleanupAndCloseModal = useCallback(() => {
    closeModal();
    setOverwrite(false);
    setOverwriteExceptions(false);
    setOverwriteActionConnectors(false);
    setActionConnectorsWarnings([]);
  }, [closeModal, setOverwrite, setOverwriteExceptions]);

  const onImportComplete = useCallback(
    (callCleanup: boolean) => {
      setIsImporting(false);
      setSelectedFiles(null);
      importComplete();

      if (callCleanup) {
        importComplete();
        cleanupAndCloseModal();
      }
    },
    [cleanupAndCloseModal, importComplete]
  );

  const importDataCallback = useCallback(async () => {
    if (selectedFiles != null) {
      setIsImporting(true);
      const abortCtrl = new AbortController();

      try {
        const {
          action_connectors_warnings: warnings,
          action_connectors_success_count: connectorsCount,
          ...importResponse
        } = await importData({
          fileToImport: selectedFiles[0],
          overwrite,
          overwriteExceptions,
          overwriteActionConnectors,
          signal: abortCtrl.signal,
        });
        setActionConnectorsWarnings(warnings as WarningSchema[]);
        setImportedActionConnectorsCount(connectorsCount);

        showToasterMessage({
          importResponse,
          exceptionsIncluded: showExceptionsCheckBox,
          successMessage,
          errorMessage,
          errorMessageDetailed: failedDetailed,
          addError,
          addSuccess,
        });
        onImportComplete(!connectorsCount);
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
    overwriteActionConnectors,
    showExceptionsCheckBox,
    successMessage,
    errorMessage,
    failedDetailed,
    addError,
    addSuccess,
    onImportComplete,
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

  const handleActionConnectorsCheckboxClick = useCallback(() => {
    setOverwriteActionConnectors((shouldOverwrite) => !shouldOverwrite);
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

            <ActionConnectorWarnings
              actionConnectorsWarnings={actionConnectorsWarnings}
              importedActionConnectorsCount={importedActionConnectorsCount}
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
                {showActionConnectorsCheckBox && (
                  <EuiCheckbox
                    data-test-subj="importDataModalActionConnectorsCheckbox"
                    id="importDataModalActionConnectorsCheckbox"
                    label={i18n.OVERWRITE_ACTION_CONNECTORS_LABEL}
                    checked={overwriteActionConnectors}
                    onChange={handleActionConnectorsCheckboxClick}
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
