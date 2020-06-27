/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, ReactNode, useEffect, useRef } from 'react';
import styled from 'styled-components';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiRadioGroup,
} from '@elastic/eui';

import { useImportList, ListSchema, Type } from '../../../lists_plugin_deps';
import * as i18n from './translations';
import { useKibana } from '../../../common/lib/kibana';

const InlineRadioGroup = styled(EuiRadioGroup)`
  display: flex;

  .euiRadioGroup__item + .euiRadioGroup__item {
    margin: 0 0 0 12px;
  }
`;

interface ListTypeOptions {
  id: Type;
  label: ReactNode;
}

const options: ListTypeOptions[] = [
  {
    id: 'keyword',
    label: i18n.KEYWORDS_RADIO,
  },
  {
    id: 'ip',
    label: i18n.IP_RADIO,
  },
];

const defaultListType: Type = 'keyword';

export interface ValueListsFormProps {
  onError: (reason: unknown) => void;
  onSuccess: (response: ListSchema) => void;
}

export const ValueListsFormComponent: React.FC<ValueListsFormProps> = ({ onError, onSuccess }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [type, setType] = useState<Type>(defaultListType);
  const filePickerRef = useRef<EuiFilePicker | null>(null);
  const { http } = useKibana().services;
  const { start: importList, abort: abortImport, ...importState } = useImportList();

  // EuiRadioGroup's onChange only infers 'string' from our options
  const handleRadioChange = useCallback((t: string) => setType(t as Type), [setType]);

  const resetForm = useCallback(() => {
    if (filePickerRef.current?.fileInput) {
      filePickerRef.current.fileInput.value = '';
      filePickerRef.current.handleChange();
    }
    setFiles(null);
    setType(defaultListType);
  }, [setType]);

  const handleCancel = useCallback(() => {
    abortImport();
  }, [abortImport]);

  const handleSuccess = useCallback(
    (response: ListSchema) => {
      resetForm();
      onSuccess(response);
    },
    [resetForm, onSuccess]
  );
  const handleError = useCallback(
    (reason: unknown) => {
      onError(reason);
    },
    [onError]
  );

  const handleImport = useCallback(() => {
    if (!importState.loading && files && files.length) {
      importList({
        file: files[0],
        listId: undefined,
        http,
        type,
      });
    }
  }, [importState.loading, files, importList, http, type]);

  useEffect(() => {
    const { error, loading, result } = importState;

    if (!loading && result) {
      handleSuccess(result);
    } else if (!loading && error) {
      handleError(error);
    }
  }, [handleError, handleSuccess, importState]);

  useEffect(() => {
    return handleCancel;
  }, [handleCancel]);

  return (
    <EuiForm>
      <EuiFormRow label={i18n.FILE_PICKER_LABEL} fullWidth>
        <EuiFilePicker
          id="value-list-file-picker"
          initialPromptText={i18n.FILE_PICKER_PROMPT}
          ref={filePickerRef}
          onChange={setFiles}
          fullWidth={true}
          isLoading={importState.loading}
        />
      </EuiFormRow>
      <EuiFormRow fullWidth>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label={i18n.LIST_TYPES_RADIO_LABEL}>
              <InlineRadioGroup
                options={options}
                idSelected={type}
                onChange={handleRadioChange}
                name="valueListType"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiFlexGroup alignItems="flexEnd">
                <EuiFlexItem>
                  {importState.loading && (
                    <EuiButtonEmpty onClick={handleCancel}>{i18n.CANCEL_BUTTON}</EuiButtonEmpty>
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton
                    onClick={handleImport}
                    disabled={!files?.length || importState.loading}
                  >
                    {i18n.UPLOAD_BUTTON}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );
};

ValueListsFormComponent.displayName = 'ValueListsFormComponent';

export const ValueListsForm = React.memo(ValueListsFormComponent);

ValueListsForm.displayName = 'ValueListsForm';
