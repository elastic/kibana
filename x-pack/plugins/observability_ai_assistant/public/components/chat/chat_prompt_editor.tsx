/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiFocusTrap, keys } from '@elastic/eui';

import { MessageRole, type Message } from '../../../common';
import { FunctionListPopover } from './function_list_popover';

import { TelemetryEventTypeWithPayload, TELEMETRY } from '../../analytics';
import { ChatPromptEditorFunction } from './chat_prompt_editor_function';
import { ChatPromptEditorPrompt } from './chat_prompt_editor_prompt';

export interface ChatPromptEditorProps {
  disabled: boolean;
  hidden: boolean;
  loading: boolean;
  initialMessage?: Message;
  onChangeHeight: (height: number) => void;
  onSendTelemetry: (eventWithPayload: TelemetryEventTypeWithPayload) => void;
  onSubmit: (message: Message) => void;
}

export function ChatPromptEditor({
  disabled,
  hidden,
  loading,
  initialMessage,
  onChangeHeight,
  onSendTelemetry,
  onSubmit,
}: ChatPromptEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const isFocusTrapEnabled = Boolean(initialMessage?.message);

  const [innerMessage, setInnerMessage] = useState<Message['message'] | undefined>(
    initialMessage?.message
  );

  const [mode, setMode] = useState<'prompt' | 'function'>(
    initialMessage?.message.function_call?.name ? 'function' : 'prompt'
  );

  const handleChangeMessageInner = (newInnerMessage: Message['message']) => {
    setInnerMessage(newInnerMessage);
  };

  const handleSelectFunction = (func: string | undefined) => {
    if (func) {
      setMode('function');
      setInnerMessage({
        function_call: { name: func, trigger: MessageRole.Assistant },
        role: MessageRole.User,
      });
      onChangeHeight(200);
      return;
    }

    setMode('prompt');
    setInnerMessage(undefined);

    if (containerRef.current) {
      onChangeHeight(containerRef.current.clientHeight);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (loading || !innerMessage) {
      return;
    }

    const oldMessage = innerMessage;

    try {
      const message = {
        '@timestamp': new Date().toISOString(),
        message: innerMessage,
      };

      onSubmit(message);

      setInnerMessage(undefined);
      setMode('prompt');

      onSendTelemetry({
        type: TELEMETRY.observability_ai_assistant_user_sent_prompt_in_chat,
        payload: message,
      });
    } catch (_) {
      setInnerMessage(oldMessage);
      setMode(oldMessage.function_call?.name ? 'function' : 'prompt');
    }
  }, [innerMessage, loading, onSendTelemetry, onSubmit]);

  // Submit on Enter
  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (!event.shiftKey && event.key === keys.ENTER && innerMessage) {
        event.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keypress', keyboardListener);

    return () => {
      window.removeEventListener('keypress', keyboardListener);
    };
  }, [handleSubmit, innerMessage]);

  useEffect(() => {
    if (hidden) {
      onChangeHeight(0);
    }
  }, [hidden, onChangeHeight]);

  return (
    <EuiFocusTrap disabled={!isFocusTrapEnabled}>
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" ref={containerRef}>
        <EuiFlexItem grow={false}>
          <FunctionListPopover
            mode={mode}
            selectedFunctionName={innerMessage?.function_call?.name}
            onSelectFunction={handleSelectFunction}
            disabled={loading || disabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {mode === 'function' && innerMessage?.function_call?.name ? (
            <ChatPromptEditorFunction
              functionName={innerMessage.function_call.name}
              functionPayload={innerMessage.function_call.arguments}
              onChange={handleChangeMessageInner}
            />
          ) : (
            <ChatPromptEditorPrompt
              disabled={disabled}
              prompt={innerMessage?.content}
              onChange={handleChangeMessageInner}
              onChangeHeight={onChangeHeight}
            />
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="observabilityAiAssistantChatPromptEditorButtonIcon"
            aria-label={i18n.translate(
              'xpack.observabilityAiAssistant.chatPromptEditor.euiButtonIcon.submitLabel',
              { defaultMessage: 'Submit' }
            )}
            disabled={loading || disabled}
            display={
              mode === 'function'
                ? innerMessage?.function_call?.name
                  ? 'fill'
                  : 'base'
                : innerMessage?.content
                ? 'fill'
                : 'base'
            }
            iconType="kqlFunction"
            isLoading={loading}
            size="m"
            onClick={handleSubmit}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFocusTrap>
  );
}
