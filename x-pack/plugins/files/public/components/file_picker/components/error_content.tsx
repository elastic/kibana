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
import { useFilePickerContext } from '../context';
import { useBehaviorSubject } from '../../use_behavior_subject';

interface Props {
  error: Error;
  onRetry: () => void;
}

export const ErrorContent: FunctionComponent<Props> = ({ error, onRetry }) => {
  const { state } = useFilePickerContext();
  const isLoading = useBehaviorSubject(state.isLoading$);
  return (
    <EuiEmptyPrompt
      iconType="alert"
      iconColor="danger"
      titleSize="xs"
      title={<h3>{i18nTexts.loadingFilesErrorTitle}</h3>}
      body={error.message}
      actions={
        <EuiButton disabled={isLoading} onClick={onRetry}>
          {i18nTexts.retryButtonLabel}
        </EuiButton>
      }
    />
  );
};
