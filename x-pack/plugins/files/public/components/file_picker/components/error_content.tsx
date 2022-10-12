/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18nTexts } from '../i18n_texts';

interface Props {
  error: Error;
  onRetry: () => void;
}

export const ErrorContent: FunctionComponent<Props> = ({ error, onRetry }) => {
  return (
    <EuiEmptyPrompt
      iconType="alert"
      color="danger"
      titleSize="s"
      title={<h3>{i18nTexts.loadingFilesErrorTitle}</h3>}
      body={error.message}
      actions={
        <EuiButton onClick={onRetry} color="danger">
          Retry
        </EuiButton>
      }
    />
  );
};
