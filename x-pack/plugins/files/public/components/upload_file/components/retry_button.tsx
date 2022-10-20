/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import { useBehaviorSubject } from '../../use_behavior_subject';
import { useUploadState } from '../context';
import { i18nTexts } from '../i18n_texts';

interface Props {
  onClick: () => void;
}

export const RetryButton: FunctionComponent<Props> = ({ onClick }) => {
  const uploadState = useUploadState();
  const uploading = useBehaviorSubject(uploadState.uploading$);

  return (
    <EuiButton
      key="retryButton"
      size="s"
      data-test-subj="retryButton"
      disabled={uploading}
      onClick={onClick}
    >
      {i18nTexts.retry}
    </EuiButton>
  );
};
