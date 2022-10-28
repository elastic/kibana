/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SetStateAction, Dispatch } from 'react';
import React, { useEffect, useRef, useCallback, useState } from 'react';

import {
  useGeneratedHtmlId,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlyoutFooter,
  EuiTextColor,
  EuiFlyout,
} from '@elastic/eui';
import type {
  BulkErrorSchema,
  ImportExceptionsResponseSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ToastInput, Toast, ErrorToastOptions } from '@kbn/core-notifications-browser';

import { useImportExceptionList } from './use_import_exception_list';

import * as i18n from './translations';

export const ImportExceptionListFlyout = React.memo(
  ({
    handleRefresh,
    http,
    addSuccess,
    addError,
    setDisplayImportListFlyout,
  }: {
    handleRefresh: () => void;
    http: HttpSetup;
    addSuccess: (toastOrTitle: ToastInput, options?: unknown) => Toast;
    addError: (error: unknown, options: ErrorToastOptions) => Toast;
    setDisplayImportListFlyout: Dispatch<SetStateAction<boolean>>;
  }) => {
    const filePickerRef = useRef<EuiFilePicker | null>(null);

    const filePickerId = useGeneratedHtmlId({ prefix: 'filePicker' });
    const [file, setFile] = useState<File | null>(null);
    const [overwrite, setOverwrite] = useState(false);
    const [asNewList, setAsNewList] = useState(false);

    const resetForm = useCallback(() => {
      if (filePickerRef.current?.fileInput) {
        filePickerRef.current.fileInput.value = '';
        filePickerRef.current.handleChange();
      }
      setFile(null);
      setAlreadyExistingItem(false);
      setAsNewList(false);
      setOverwrite(false);
    }, []);
    const { start: importExceptionList, ...importExceptionListState } = useImportExceptionList();
    const ctrl = useRef(new AbortController());

    const handleImportExceptionList = useCallback(() => {
      if (!importExceptionListState.loading && file) {
        ctrl.current = new AbortController();

        importExceptionList({
          file,
          http,
          signal: ctrl.current.signal,
          overwrite,
          overwriteExceptions: overwrite,
          asNewList,
        });
      }
    }, [asNewList, file, http, importExceptionList, importExceptionListState.loading, overwrite]);

    const handleImportSuccess = useCallback(
      (response: ImportExceptionsResponseSchema) => {
        resetForm();
        addSuccess({
          text: i18n.uploadSuccessMessage(file?.name ?? ''),
          title: i18n.UPLOAD_SUCCESS_TITLE,
        });
        handleRefresh();
      },
      // looking for file.name but we don't wan't to render success every time file name changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [resetForm, addSuccess, handleRefresh]
    );
    const handleImportError = useCallback(
      (errors: BulkErrorSchema[]) => {
        errors.forEach((error) => {
          if (!error.error.message.includes('AbortError')) {
            addError(error.error.message, { title: i18n.UPLOAD_ERROR });
          }
        });
      },
      [addError]
    );
    const [alreadyExistingItem, setAlreadyExistingItem] = useState(false);

    useEffect(() => {
      if (!importExceptionListState.loading) {
        if (importExceptionListState?.result?.success) {
          handleImportSuccess(importExceptionListState?.result);
        } else if (importExceptionListState?.result?.errors) {
          handleImportError(importExceptionListState?.result?.errors);
        }
      }
    }, [
      handleImportError,
      handleImportSuccess,
      importExceptionListState.error,
      importExceptionListState.loading,
      importExceptionListState.result,
      setAlreadyExistingItem,
    ]);
    const handleFileChange = useCallback((files: FileList | null) => {
      setFile(files?.item(0) ?? null);
    }, []);
    return (
      <EuiFlyout ownFocus size="s" onClose={() => setDisplayImportListFlyout(false)}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{'Import shared exception list'}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>{'Select shared exception lists to import'}</EuiText>
          <EuiFilePicker
            id={filePickerId}
            multiple
            ref={filePickerRef}
            initialPromptText="Select or drag and drop multiple files"
            onChange={handleFileChange}
            display={'large'}
            aria-label="Use aria labels when no actual label is in use"
          />

          {alreadyExistingItem && (
            <>
              <EuiSpacer />
              <EuiTextColor color={'danger'}>{i18n.IMPORT_EXCEPTION_LIST_WARNING}</EuiTextColor>
              <EuiSpacer />
              <EuiCheckbox
                id={'basicCheckboxId'}
                label={i18n.IMPORT_EXCEPTION_LIST_OVERWRITE}
                checked={overwrite}
                onChange={(e) => {
                  setOverwrite(!overwrite);
                  setAsNewList(false);
                }}
              />
              <EuiCheckbox
                id={'createNewListCheckbox'}
                label={i18n.IMPORT_EXCEPTION_LIST_AS_NEW_LIST}
                checked={asNewList}
                onChange={(e) => {
                  setAsNewList(!asNewList);
                  setOverwrite(false);
                }}
              />
            </>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                onClick={() => setDisplayImportListFlyout(false)}
                flush="left"
              >
                {'Close'}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="exception-lists-form-import-action"
                onClick={handleImportExceptionList}
                disabled={file == null || importExceptionListState.loading}
              >
                {i18n.UPLOAD_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
