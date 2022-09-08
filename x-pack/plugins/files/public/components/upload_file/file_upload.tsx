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

import './file_upload.scss';

export interface Props
  extends Omit<EuiFilePickerProps, 'multiple' | 'onChange' | 'value' | 'initialPromptText'> {
  onChange: (files: File[]) => void;
  onDone: () => void;
  onUpload: () => void;
  onClear: () => void;
  onCancel: () => void;
  uploading: boolean;
  immediate?: boolean;
  initialFilePromptText?: string;
}

export const FileUploadUI = React.forwardRef<EuiFilePicker, Props>((props, ref) => {
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
    children,
    ...rest
  } = props;
  const cn = useMemo(() => classNames({ filesFileUpload: true }, className), [className]);

  return (
    <div className={cn} style={style}>
      <EuiFilePicker
        {...rest}
        ref={ref}
        onChange={(files) => onChange(Array.from(files ?? []))}
        multiple={false}
        initialPromptText={initialFilePromptText}
        compressed={compressed}
        isLoading={uploading}
        disabled={uploading}
      />

      <EuiSpacer size="s" />

      <EuiFlexGroup justifyContent="flexStart" direction="rowReverse" gutterSize="m">
        <EuiFlexItem grow={false}>
          {!immediate && (
            <EuiButton disabled={uploading} onClick={onUpload} size={compressed ? 's' : 'm'}>
              {i18nTexts.upload}
            </EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {uploading ? (
            <EuiButtonEmpty onClick={onCancel} color="danger">
              {i18nTexts.cancel}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty onClick={onClear} size={compressed ? 's' : 'm'}>
              {i18nTexts.clear}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
