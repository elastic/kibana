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
}

export const ErrorContent: FunctionComponent<Props> = ({ error }) => {
  const { state } = useFilePickerContext();
  const isLoading = useBehaviorSubject(state.isLoading$);
  return (
    <EuiEmptyPrompt
      data-test-subj="errorPrompt"
      iconType="alert"
      iconColor="danger"
      titleSize="xs"
      title={<h3>{i18nTexts.loadingFilesErrorTitle}</h3>}
      body={error.message}
      actions={
        <EuiButton disabled={isLoading} onClick={state.retry}>
          {i18nTexts.retryButtonLabel}
        </EuiButton>
      }
    />
  );
};
