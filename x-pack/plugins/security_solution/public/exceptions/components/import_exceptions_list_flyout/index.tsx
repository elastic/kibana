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

import { useImportExceptionList } from '../../hooks/use_import_exception_list';

import * as i18n from '../../translations';

// eslint-disable-next-line react/display-name
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
    const [files, setFiles] = useState<FileList | null>(null);
    const [overwrite, setOverwrite] = useState(false);
    const [asNewList, setAsNewList] = useState(false);
    const [alreadyExistingItem, setAlreadyExistingItem] = useState(false);

    const resetForm = useCallback(() => {
      if (filePickerRef.current?.fileInput) {
        filePickerRef.current.fileInput.value = '';
        filePickerRef.current.handleChange();
      }
      setFiles(null);
      setAlreadyExistingItem(false);
      setAsNewList(false);
      setOverwrite(false);
    }, []);
    const { start: importExceptionList, ...importExceptionListState } = useImportExceptionList();
    const ctrl = useRef(new AbortController());

    const handleImportExceptionList = useCallback(() => {
      if (!importExceptionListState.loading && files) {
        ctrl.current = new AbortController();

        Array.from(files).forEach((file) =>
          importExceptionList({
            file,
            http,
            signal: ctrl.current.signal,
            overwrite,
            overwriteExceptions: overwrite,
            asNewList,
          })
        );
      }
    }, [asNewList, files, http, importExceptionList, importExceptionListState.loading, overwrite]);

    const handleImportSuccess = useCallback(
      (response: ImportExceptionsResponseSchema) => {
        resetForm();
        addSuccess({
          title: i18n.UPLOAD_SUCCESS_TITLE,
        });
        handleRefresh();
      },
      [resetForm, addSuccess, handleRefresh]
    );

    const handleImportErrors = useCallback(
      (errors: BulkErrorSchema[]) => {
        errors.forEach((error) => {
          if (!error.error.message.includes('AbortError')) {
            addError(error.error.message, { title: i18n.UPLOAD_ERROR });
          }
        });
      },
      [addError]
    );

    useEffect(() => {
      if (!importExceptionListState.loading) {
        if (importExceptionListState?.result?.success) {
          handleImportSuccess(importExceptionListState?.result);
        } else {
          const errorsToDisplay: BulkErrorSchema[] = [];
          // @ts-expect-error
          if (importExceptionListState?.error?.body) {
            errorsToDisplay.push({
              // @ts-expect-error
              error: { ...importExceptionListState?.error?.body },
            });
          }
          if (importExceptionListState?.result?.errors) {
            importExceptionListState?.result?.errors.forEach((err) => {
              if (err.error.message.includes('already exists')) {
                setAlreadyExistingItem(true);
              }
              errorsToDisplay.push(err);
            });
          }
          handleImportErrors(errorsToDisplay);
        }
      }
    }, [
      handleImportErrors,
      handleImportSuccess,
      importExceptionListState?.error,
      importExceptionListState.loading,
      importExceptionListState?.result,
      importExceptionListState?.result?.errors,
    ]);
    const handleFileChange = useCallback((inputFiles: FileList | null) => {
      setFiles(inputFiles ?? null);
    }, []);

    const importExceptionListFlyoutTitleId = useGeneratedHtmlId({
      prefix: 'importExceptionListFlyoutTitle',
    });

    return (
      <EuiFlyout
        ownFocus
        size="s"
        onClose={() => setDisplayImportListFlyout(false)}
        aria-labelledby={importExceptionListFlyoutTitleId}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={importExceptionListFlyoutTitleId}>{i18n.IMPORT_EXCEPTION_LIST_HEADER}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>{i18n.IMPORT_EXCEPTION_LIST_BODY}</EuiText>
          <EuiFilePicker
            id={filePickerId}
            multiple
            ref={filePickerRef}
            initialPromptText={i18n.IMPORT_PROMPT}
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
                data-test-subj="importExceptionListOverwriteExistingCheckbox"
                onChange={(e) => {
                  setOverwrite(!overwrite);
                  setAsNewList(false);
                }}
              />
              <EuiCheckbox
                id={'createNewListCheckbox'}
                label={i18n.IMPORT_EXCEPTION_LIST_AS_NEW_LIST}
                data-test-subj="importExceptionListCreateNewCheckbox"
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
                data-test-subj="exceptionListsImportFormCloseBTN"
                iconType="cross"
                onClick={() => setDisplayImportListFlyout(false)}
                flush="left"
              >
                {i18n.CLOSE_FLYOUT}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="exception-lists-form-import-action"
                onClick={handleImportExceptionList}
                disabled={files == null || importExceptionListState.loading}
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
