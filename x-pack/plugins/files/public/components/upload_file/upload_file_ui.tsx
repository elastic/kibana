/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import classNames from 'classnames';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiFilePickerProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { i18nTexts } from './i18n_texts';

import './upload_file.scss';

export interface Props
  extends Omit<EuiFilePickerProps, 'onChange' | 'value' | 'initialPromptText' | 'disabled'> {
  onChange: (files: File[]) => void;
  onUpload: () => void;
  onClear: () => void;
  onCancel: () => void;
  done?: boolean;
  ready?: boolean;
  uploading?: boolean;
  immediate?: boolean;
  initialFilePromptText?: string;
}

export const UploadFileUI = React.forwardRef<EuiFilePicker, Props>((props, ref) => {
  const {
    compressed,
    uploading,
    onChange,
    onClear,
    onCancel,
    onUpload,
    immediate,
    initialFilePromptText,
    className,
    style,
    isInvalid,
    ready,
    done,
    ...rest
  } = props;

  const cn = useMemo(() => classNames({ filesUploadFile: true }, className), [className]);
  const showRetryButton = isInvalid;

  return (
    <div className={cn} style={style}>
      <EuiFilePicker
        {...rest}
        ref={ref}
        onChange={(files) => onChange(Array.from(files ?? []))}
        multiple={false}
        initialPromptText={initialFilePromptText}
        isLoading={uploading}
        isInvalid={isInvalid}
        disabled={done || uploading}
      />

      <EuiSpacer size="s" />

      <EuiFlexGroup justifyContent="flexStart" direction="rowReverse" gutterSize="m">
        <EuiFlexItem grow={false}>
          {!immediate && !showRetryButton && (
            <EuiButton
              color={done ? 'success' : 'primary'}
              disabled={done || uploading || !ready || isInvalid}
              onClick={onUpload}
              size="s"
            >
              {i18nTexts.upload}
            </EuiButton>
          )}
          {showRetryButton && (
            <EuiButton disabled={done || uploading} onClick={onUpload} size="s">
              {i18nTexts.retry}
            </EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {uploading || !done ? (
            <EuiButtonEmpty size="s" disabled={!uploading} onClick={onCancel} color="danger">
              {i18nTexts.cancel}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty size="s" onClick={onClear} color="primary">
              {i18nTexts.clear}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
