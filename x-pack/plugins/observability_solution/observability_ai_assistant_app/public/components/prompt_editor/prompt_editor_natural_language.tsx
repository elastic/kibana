/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import type { Message } from '@kbn/observability-ai-assistant-plugin/common';

interface Props {
  disabled: boolean;
  prompt: string | undefined;
  onChange: (message: Message['message']) => void;
  onChangeHeight: (height: number) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export function PromptEditorNaturalLanguage({
  disabled,
  prompt,
  onChange,
  onChangeHeight,
  onFocus,
  onBlur,
}: Props) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleResizeTextArea();

    onChange({
      role: MessageRole.User,
      content: event.currentTarget.value,
    });
  };

  const handleResizeTextArea = useCallback(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.minHeight = 'auto';

      const cappedHeight = Math.min(textAreaRef.current?.scrollHeight, 350);

      textAreaRef.current.style.minHeight = cappedHeight + 'px';

      onChangeHeight(cappedHeight);
    }
  }, [onChangeHeight]);

  useEffect(() => {
    const textarea = textAreaRef.current;

    if (textarea) {
      textarea.focus();
    }
  }, []);

  useEffect(() => {
    handleResizeTextArea();
  }, [handleResizeTextArea]);

  useEffect(() => {
    if (prompt === undefined) {
      handleResizeTextArea();
    }
  }, [handleResizeTextArea, prompt]);

  return (
    <EuiTextArea
      data-test-subj="observabilityAiAssistantChatPromptEditorTextArea"
      css={{ maxHeight: 200 }}
      disabled={disabled}
      fullWidth
      inputRef={textAreaRef}
      placeholder={i18n.translate('xpack.observabilityAiAssistant.prompt.placeholder', {
        defaultMessage: 'Send a message to the Assistant',
      })}
      resize="vertical"
      rows={1}
      value={prompt || ''}
      onChange={handleChange}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}
