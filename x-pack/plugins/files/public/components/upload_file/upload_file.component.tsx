/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiIcon,
  EuiText,
  EuiButton,
  EuiSpacer,
  useEuiTheme,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFilePicker,
  EuiButtonEmpty,
  type EuiFilePickerProps,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { i18nTexts } from './i18n_texts';

export interface Props
  extends Omit<EuiFilePickerProps, 'onChange' | 'value' | 'initialPromptText' | 'disabled'> {
  onChange: (files: File[]) => void;
  onUpload: (meta?: unknown) => void;
  onClear: () => void;
  onCancel: () => void;
  label?: string;
  errorMessage?: string;
  accept?: string;
  done?: boolean;
  ready?: boolean;
  uploading?: boolean;
  immediate?: boolean;
  retry?: boolean;
  allowClear?: boolean;
  initialFilePromptText?: string;
  meta?: unknown;
}

const { euiFormMaxWidth, euiButtonHeight, euiButtonHeightSmall } = euiThemeVars;

export const UploadFile = React.forwardRef<EuiFilePicker, Props>((props, ref) => {
  const {
    done,
    meta,
    label,
    ready,
    retry,
    style,
    accept,
    onClear,
    onCancel,
    onChange,
    onUpload,
    className,
    immediate,
    uploading,
    isInvalid,
    compressed,
    errorMessage,
    allowClear = false,
    initialFilePromptText,
    ...rest
  } = props;

  const { euiTheme } = useEuiTheme();
  const { size } = euiTheme;
  const id = useGeneratedHtmlId({ prefix: 'filesUploadFile' });
  const errorId = `${id}_error`;

  const controllButton = (): JSX.Element | null => {
    if (uploading) {
      return (
        <EuiButtonEmpty
          key="cancelButton"
          size="s"
          data-test-subj="cancelButton"
          disabled={!uploading}
          onClick={onCancel}
          color="danger"
        >
          {i18nTexts.cancel}
        </EuiButtonEmpty>
      );
    }

    if (retry) {
      return (
        <EuiButtonEmpty
          key="retryButton"
          size="s"
          data-test-subj="retryButton"
          disabled={done || uploading}
          onClick={() => onUpload(meta)}
        >
          {i18nTexts.retry}
        </EuiButtonEmpty>
      );
    }

    if (!done && !immediate) {
      return (
        <EuiButton
          key="uploadButton"
          color={done ? 'success' : 'primary'}
          disabled={done || uploading || !ready || isInvalid}
          onClick={onUpload}
          size="s"
          data-test-subj="uploadButton"
        >
          {uploading ? i18nTexts.uploading : i18nTexts.upload}
        </EuiButton>
      );
    }
    if (done) {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiIcon
            css={css`
              margin-inline: ${size.m};
              height: ${euiButtonHeight};
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
        onChange={(files) => {
          onChange(Array.from(files ?? []));
        }}
        multiple={false}
        initialPromptText={initialFilePromptText}
        isLoading={uploading}
        isInvalid={isInvalid}
        accept={accept}
        disabled={done || uploading}
        aria-describedby={errorMessage ? errorId : undefined}
      />

      <EuiSpacer size="s" />

      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="flexStart"
        direction="rowReverse"
        gutterSize="m"
      >
        <EuiFlexItem grow={false}>{controllButton()}</EuiFlexItem>
        {!done && !uploading && Boolean(errorMessage) && (
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
        {done && allowClear && (
          <>
            <EuiFlexItem />
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                data-test-subj="clearButton"
                onClick={onClear}
                color="primary"
              >
                {i18nTexts.clear}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </div>
  );
});
