/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18nTexts } from '../i18n_texts';
import { useUploadState } from '../context';
import { useBehaviorSubject } from '../../use_behavior_subject';

interface Props {
  onClick: () => void;
}

export const UploadButton: FunctionComponent<Props> = ({ onClick }) => {
  const uploadState = useUploadState();
  const uploading = useBehaviorSubject(uploadState.uploading$);
  const error = useBehaviorSubject(uploadState.error$);
  const files = useObservable(uploadState.files$, []);
  return (
    <EuiButton
      key="uploadButton"
      disabled={Boolean(!files.length || uploading || error)}
      onClick={onClick}
      size="s"
      data-test-subj="uploadButton"
    >
      {uploading ? i18nTexts.uploading : i18nTexts.upload}
    </EuiButton>
  );
};
