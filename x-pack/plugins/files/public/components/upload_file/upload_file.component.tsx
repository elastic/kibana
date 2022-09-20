/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFilePicker,
  useGeneratedHtmlId,
  type EuiFilePickerProps,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { useBehaviorSubject } from '../use_behavior_subject';
import { i18nTexts } from './i18n_texts';
import { ControlButton, ClearButton } from './components';
import { useUploadState } from './context';

export interface Props
  extends Omit<EuiFilePickerProps, 'onChange' | 'value' | 'initialPromptText' | 'disabled'> {
  meta?: unknown;
  accept?: string;
  immediate?: boolean;
  allowClear?: boolean;
  initialFilePromptText?: string;

  onClear: () => void;
  onCancel: () => void;
  onChange: (files: File[]) => void;
  onUpload: (meta?: unknown) => void;
}

const { euiFormMaxWidth, euiButtonHeightSmall } = euiThemeVars;

export const UploadFile = React.forwardRef<EuiFilePicker, Props>((props, ref) => {
  const {
    meta,
    style,
    accept,
    onClear,
    onCancel,
    onChange,
    onUpload,
    className,
    immediate,
    compressed,
    allowClear = false,
    initialFilePromptText,
    ...rest
  } = props;

  const uploadState = useUploadState();
  const uploading = useBehaviorSubject(uploadState.uploading$);
  const error = useBehaviorSubject(uploadState.error$);
  const done = useObservable(uploadState.done$);
  const isInvalid = Boolean(error);
  const errorMessage = error?.message;

  const id = useGeneratedHtmlId({ prefix: 'filesUploadFile' });
  const errorId = `${id}_error`;

  return (
    <div
      data-test-subj="filesUploadFile"
      css={css`
        max-width: ${euiFormMaxWidth};
      `}
      className={className}
      style={style}
    >
      <EuiFilePicker
        aria-label={i18nTexts.defaultPickerLabel}
        {...rest}
        id={id}
        ref={ref}
        onChange={(fs) => {
          onChange(Array.from(fs ?? []));
        }}
        multiple={false}
        initialPromptText={initialFilePromptText}
        isLoading={uploading}
        isInvalid={isInvalid}
        accept={accept}
        disabled={Boolean(done?.length || uploading)}
        aria-describedby={errorMessage ? errorId : undefined}
      />

      <EuiSpacer size="s" />

      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="flexStart"
        direction="rowReverse"
        gutterSize="m"
      >
        <EuiFlexItem grow={false}>
          <ControlButton
            immediate={immediate}
            onCancel={onCancel}
            onUpload={() => onUpload(meta)}
          />
        </EuiFlexItem>
        {Boolean(!done && !uploading && errorMessage) && (
          <EuiFlexItem>
            <EuiText
              data-test-subj="error"
              css={css`
                display: flex;
                align-items: center;
                min-height: ${euiButtonHeightSmall};
              `}
              size="s"
              color="danger"
            >
              <span id={errorId}>{errorMessage}</span>
            </EuiText>
          </EuiFlexItem>
        )}
        {done?.length && allowClear && (
          <>
            <EuiFlexItem /> {/* Occupy middle space */}
            <EuiFlexItem grow={false}>
              <ClearButton onClick={onClear} />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </div>
  );
});
