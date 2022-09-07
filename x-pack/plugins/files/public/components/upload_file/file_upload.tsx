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
  initialFilePromptText?: string;
}

export const FileUploadUI = React.forwardRef<EuiFilePicker, Props>(
  ({ onChange, initialFilePromptText, className, style, ...rest }, ref) => {
    const cn = useMemo(() => classNames(className, { filesFileUpload: true }), [className]);
    return (
      <div className={cn} style={style}>
        <EuiFilePicker
          {...rest}
          ref={ref}
          onChange={(files) => onChange(Array.from(files ?? []))}
          multiple={false}
          initialPromptText={initialFilePromptText}
        />
        <EuiSpacer />
        <EuiFlexGroup justifyContent="flexEnd" direction="rowReverse" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButton>{i18nTexts.upload}</EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty>{i18nTexts.clear}</EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
);
