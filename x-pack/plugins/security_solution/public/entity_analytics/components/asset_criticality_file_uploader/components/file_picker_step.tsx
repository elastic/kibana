/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilePicker, EuiSpacer } from '@elastic/eui';
import React from 'react';

interface AssetCriticalityFilePickerStepProps {
  onFileChange: (fileList: FileList | null) => void;
  isLoading: boolean;
  errorMessage?: string;
}

export const AssetCriticalityFilePickerStep: React.FC<AssetCriticalityFilePickerStepProps> = ({
  onFileChange,
  errorMessage,
  isLoading,
}) => (
  <>
    {'Select a text file:'}
    <EuiSpacer size="l" />

    <EuiFilePicker
      fullWidth
      // multiple
      initialPromptText="content that appears in the dropzone if no file is attached"
      onChange={onFileChange}
      isInvalid={!!errorMessage}
      isLoading={isLoading}
    />
    <br />
    {errorMessage && <div>{errorMessage}</div>}
    {/* {state.parserError && <div>{state.parserError.message}</div>}
    {state.unsupportedFileTypeError && <div>{state.unsupportedFileTypeError}</div>}
    {state.fileValidationError && <div>{state.fileValidationError}</div>} */}
  </>
);
