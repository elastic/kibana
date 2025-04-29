/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, KeyboardEvent } from 'react';
import { css } from '@emotion/css';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextArea,
  keys,
  useEuiTheme,
} from '@elastic/eui';
import { chatCommonLabels } from './i18n';

interface ChatInputFormProps {
  disabled: boolean;
  loading: boolean;
  onSubmit: (message: string) => void;
}

export const ChatInputForm: React.FC<ChatInputFormProps> = ({ disabled, loading, onSubmit }) => {
  const [message, setMessage] = useState<string>('');
  const { euiTheme } = useEuiTheme();

  const handleSubmit = useCallback(() => {
    if (loading || !message.trim()) {
      return;
    }

    onSubmit(message);
    setMessage('');
  }, [message, loading, onSubmit]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.currentTarget.value);
  }, []);

  const handleTextAreaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!event.shiftKey && event.key === keys.ENTER) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const topContainerClass = css`
    padding-bottom: ${euiTheme.size.m};
  `;

  const inputFlexItemClass = css`
    max-width: 900px;
  `;

  return (
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      alignItems="center"
      justifyContent="center"
      className={topContainerClass}
    >
      <EuiFlexItem className={inputFlexItemClass}>
        <EuiTextArea
          data-test-subj="workchatAppChatInputFormTextArea"
          fullWidth
          rows={1}
          value={message}
          onChange={handleChange}
          onKeyDown={handleTextAreaKeyDown}
          placeholder={chatCommonLabels.userInputBox.placeholder}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          data-test-subj="workchatAppChatInputFormSubmitButton"
          iconType="kqlFunction"
          display="fill"
          size="m"
          onClick={handleSubmit}
          disabled={loading || disabled}
          isLoading={loading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
