/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiPanel,
  EuiTextArea,
  keys,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { MessageRole, type Message } from '../../../common';
import { FunctionListPopover } from './function_list_popover';
import { useJsonEditorModel } from '../../hooks/use_json_editor_model';
import { TelemetryEventTypeWithPayload, TELEMETRY } from '../../analytics';

export interface ChatPromptEditorProps {
  disabled: boolean;
  hidden: boolean;
  loading: boolean;
  initialPrompt?: string;
  initialSelectedFunctionName?: string;
  initialFunctionPayload?: string;
  trigger?: MessageRole;
  onChangeHeight: (height: number) => void;
  onSendTelemetry: (eventWithPayload: TelemetryEventTypeWithPayload) => void;
  onSubmit: (message: Message) => void;
}

export function ChatPromptEditor({
  disabled,
  hidden,
  loading,
  initialPrompt,
  initialSelectedFunctionName,
  initialFunctionPayload,
  onChangeHeight,
  onSendTelemetry,
  onSubmit,
}: ChatPromptEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const isFocusTrapEnabled = Boolean(initialPrompt);

  const [prompt, setPrompt] = useState(initialPrompt);

  const [selectedFunctionName, setSelectedFunctionName] = useState<string | undefined>(
    initialSelectedFunctionName
  );
  const [functionPayload, setFunctionPayload] = useState<string | undefined>(
    initialFunctionPayload
  );
  const [functionEditorLineCount, setFunctionEditorLineCount] = useState<number>(0);

  const { model, initialJsonString } = useJsonEditorModel({
    functionName: selectedFunctionName,
    initialJson: functionPayload,
  });

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.currentTarget.value);

    handleResizeTextArea();
  };

  const handleChangeFunctionPayload = (params: string) => {
    setFunctionPayload(params);
    recalculateFunctionEditorLineCount();
  };

  const handleSelectFunction = (functionName: string | undefined) => {
    setPrompt('');
    setFunctionPayload('');
    setSelectedFunctionName(functionName);

    if (functionName) {
      onChangeHeight(200);
      return;
    }

    if (containerRef.current) {
      onChangeHeight(containerRef.current.clientHeight);
    }
  };

  const handleResizeTextArea = useCallback(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.minHeight = 'auto';
      textAreaRef.current.style.minHeight = textAreaRef.current?.scrollHeight + 'px';
    }

    onChangeHeight(textAreaRef.current?.scrollHeight || 0);
  }, [onChangeHeight]);

  const handleResetTextArea = () => {
    if (textAreaRef.current) {
      textAreaRef.current.style.minHeight = 'auto';
    }
  };

  const recalculateFunctionEditorLineCount = useCallback(() => {
    const newLineCount = model?.getLineCount() || 0;
    if (newLineCount !== functionEditorLineCount) {
      setFunctionEditorLineCount(newLineCount + 1);
    }
  }, [functionEditorLineCount, model]);

  const handleSubmit = useCallback(async () => {
    if (loading || (!prompt?.trim() && !selectedFunctionName)) {
      return;
    }
    const currentPrompt = prompt;
    const currentPayload = functionPayload;

    setPrompt('');
    setFunctionPayload(undefined);
    handleResetTextArea();

    let message: Message;

    try {
      if (selectedFunctionName) {
        message = {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.Assistant,
            content: '',
            function_call: {
              name: selectedFunctionName,
              trigger: MessageRole.User,
              arguments: currentPayload,
            },
          },
        };
        onSubmit(message);

        setFunctionPayload(undefined);
        setSelectedFunctionName(undefined);
      } else {
        message = {
          '@timestamp': new Date().toISOString(),
          message: { role: MessageRole.User, content: currentPrompt },
        };
        onSubmit(message);
      }

      onSendTelemetry({
        type: TELEMETRY.observability_ai_assistant_user_sent_prompt_in_chat,
        payload: message,
      });
    } catch (_) {
      setPrompt(currentPrompt);
    }
  }, [functionPayload, loading, onSendTelemetry, onSubmit, prompt, selectedFunctionName]);

  useEffect(() => {
    setFunctionPayload(initialJsonString);
  }, [initialJsonString, selectedFunctionName]);

  useEffect(() => {
    recalculateFunctionEditorLineCount();
  }, [model, recalculateFunctionEditorLineCount]);

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (!event.shiftKey && event.key === keys.ENTER && (prompt || selectedFunctionName)) {
        event.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keypress', keyboardListener);

    return () => {
      window.removeEventListener('keypress', keyboardListener);
    };
  }, [handleSubmit, prompt, selectedFunctionName]);

  useEffect(() => {
    const textarea = textAreaRef.current;

    if (textarea) {
      textarea.focus();
    }
  }, [handleResizeTextArea]);

  useEffect(() => {
    handleResizeTextArea();
  }, [handleResizeTextArea]);

  return (
    <EuiFocusTrap disabled={!isFocusTrapEnabled}>
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" ref={containerRef}>
        <EuiFlexItem grow={false}>
          <FunctionListPopover
            selectedFunctionName={selectedFunctionName}
            onSelectFunction={handleSelectFunction}
            disabled={loading || disabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {selectedFunctionName ? (
            <EuiPanel borderRadius="none" color="subdued" hasShadow={false} paddingSize="xs">
              <CodeEditor
                aria-label={i18n.translate(
                  'xpack.observabilityAiAssistant.chatPromptEditor.codeEditor.payloadEditorLabel',
                  { defaultMessage: 'payloadEditor' }
                )}
                data-test-subj="observabilityAiAssistantChatPromptEditorCodeEditor"
                fullWidth
                height={'180px'}
                languageId="json"
                isCopyable
                languageConfiguration={{
                  autoClosingPairs: [
                    {
                      open: '{',
                      close: '}',
                    },
                  ],
                }}
                editorDidMount={(editor) => {
                  editor.focus();
                }}
                options={{
                  accessibilitySupport: 'off',
                  acceptSuggestionOnEnter: 'on',
                  automaticLayout: true,
                  autoClosingQuotes: 'always',
                  autoIndent: 'full',
                  contextmenu: true,
                  fontSize: 12,
                  formatOnPaste: true,
                  formatOnType: true,
                  inlineHints: { enabled: true },
                  lineNumbers: 'on',
                  minimap: { enabled: false },
                  model,
                  overviewRulerBorder: false,
                  quickSuggestions: true,
                  scrollbar: { alwaysConsumeMouseWheel: false },
                  scrollBeyondLastLine: false,
                  suggestOnTriggerCharacters: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  wrappingIndent: 'indent',
                }}
                transparentBackground
                value={functionPayload || ''}
                onChange={handleChangeFunctionPayload}
              />
            </EuiPanel>
          ) : (
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
              value={prompt}
              onChange={handleChange}
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
            disabled={selectedFunctionName ? false : !prompt?.trim() || loading || disabled}
            display={
              selectedFunctionName ? (functionPayload ? 'fill' : 'base') : prompt ? 'fill' : 'base'
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
