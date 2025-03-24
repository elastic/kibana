/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, KeyboardEvent } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextArea,
  EuiPanel,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ChatInputFormProps {
  disabled: boolean;
  loading: boolean;
  onSubmit: (message: string) => void;
}

export const ChatInputForm: React.FC<ChatInputFormProps> = ({ disabled, loading, onSubmit }) => {
  const [message, setMessage] = useState<string>('');

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

  return (
    <EuiPanel paddingSize="s">
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        <EuiFlexItem>
          <EuiTextArea
            data-test-subj="workchatAppChatInputFormTextArea"
            fullWidth
            rows={1}
            value={message}
            onChange={handleChange}
            onKeyDown={handleTextAreaKeyDown}
            placeholder={i18n.translate('xpack.workchatApp.chatInputForm.placeholder', {
              defaultMessage: 'Ask anything',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="workchatAppChatInputFormSubmitButton"
            iconType="kqlFunction"
            onClick={handleSubmit}
            disabled={loading || disabled}
            isLoading={loading}
            display="base"
            size="m"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
