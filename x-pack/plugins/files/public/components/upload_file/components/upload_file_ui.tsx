/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import classNames from 'classnames';
import {
  EuiFormRow,
  EuiButton,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFilePicker,
  EuiButtonEmpty,
  type EuiFilePickerProps,
} from '@elastic/eui';
import { i18nTexts } from '../i18n_texts';

import './upload_file.scss';

export interface Props
  extends Omit<EuiFilePickerProps, 'onChange' | 'value' | 'initialPromptText' | 'disabled'> {
  onChange: (files: File[]) => void;
  onUpload: () => void;
  onClear: () => void;
  onCancel: () => void;
  label?: string;
  errorMessage?: string;
  accept?: string;
  done?: boolean;
  ready?: boolean;
  uploading?: boolean;
  immediate?: boolean;
  retry?: boolean;
  allowClear?: boolean;
  initialFilePromptText?: string;
}

export const UploadFileUI = React.forwardRef<EuiFilePicker, Props>((props, ref) => {
  const {
    done,
    label,
    ready,
    retry,
    style,
    accept,
    onClear,
    onCancel,
    onChange,
    onUpload,
    className,
    immediate,
    uploading,
    isInvalid,
    compressed,
    errorMessage,
    allowClear = false,
    initialFilePromptText,
    ...rest
  } = props;

  const cn = useMemo(() => classNames({ filesUploadFile: true }, className), [className]);

  return (
    <div data-test-subj="filesUploadFile" className={cn} style={style}>
      <EuiFormRow isInvalid={isInvalid} label={label} error={errorMessage}>
        <EuiFilePicker
          {...rest}
          ref={ref}
          onChange={(files) => {
            onChange(Array.from(files ?? []));
          }}
          multiple={false}
          initialPromptText={initialFilePromptText}
          isLoading={uploading}
          isInvalid={isInvalid}
          accept={accept}
          disabled={done || uploading}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart" alignItems="center" direction="row" gutterSize="m">
        <EuiFlexItem grow={false}>
          {!immediate && !retry && (
            <EuiButton
              color={done ? 'success' : 'primary'}
              disabled={done || uploading || !ready || isInvalid}
              onClick={onUpload}
              size="s"
              data-test-subj="uploadButton"
            >
              {uploading ? i18nTexts.uploading : i18nTexts.upload}
            </EuiButton>
          )}
          {retry && (
            <EuiButton
              data-data-test-subj="retryButton"
              disabled={done || uploading}
              onClick={onUpload}
              size="s"
            >
              {i18nTexts.retry}
            </EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {uploading || !done || !allowClear ? (
            <EuiButtonEmpty
              data-test-subj="cancelButton"
              size="s"
              disabled={!uploading}
              onClick={onCancel}
              color="danger"
            >
              {i18nTexts.cancel}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty data-test-subj="clearButton" size="s" onClick={onClear} color="primary">
              {i18nTexts.clear}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
