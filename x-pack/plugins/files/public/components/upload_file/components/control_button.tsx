/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FunctionComponent } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { euiThemeVars } from '@kbn/ui-theme';
import { useBehaviorSubject } from '../../use_behavior_subject';
import { useUploadState } from '../context';
import { i18nTexts } from '../i18n_texts';
import { UploadButton } from './upload_button';
import { RetryButton } from './retry_button';
import { CancelButton } from './cancel_button';

const { euiButtonHeightSmall } = euiThemeVars;

interface Props {
  onCancel: () => void;
  onUpload: () => void;
  immediate?: boolean;
}

export const ControlButton: FunctionComponent<Props> = ({ onCancel, onUpload, immediate }) => {
  const uploadState = useUploadState();
  const {
    euiTheme: { size },
  } = useEuiTheme();
  const uploading = useBehaviorSubject(uploadState.uploading$);
  const files = useObservable(uploadState.files$, []);
  const done = useObservable(uploadState.done$);
  const retry = Boolean(files.some((f) => f.status === 'upload_failed'));

  if (uploading) return <CancelButton onClick={onCancel} />;
  if (retry) return <RetryButton onClick={onUpload} />;
  if (!done && !immediate) return <UploadButton onClick={onUpload} />;

  if (done) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiIcon
          css={css`
            margin-inline: ${size.m};
            height: ${euiButtonHeightSmall};
          `}
          data-test-subj="uploadSuccessIcon"
          type="checkInCircleFilled"
          color="success"
          aria-label={i18nTexts.uploadDone}
        />
      </EuiFlexGroup>
    );
  }
  return null;
};
