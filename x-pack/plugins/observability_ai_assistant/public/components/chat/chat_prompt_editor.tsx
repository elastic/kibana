/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTextArea,
  keys,
  EuiFocusTrap,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { MessageRole, type Message } from '../../../common';
import { useJsonEditorModel } from '../../hooks/use_json_editor_model';
import { FunctionListPopover } from './function_list_popover';

export interface ChatPromptEditorProps {
  disabled: boolean;
  loading: boolean;
  initialPrompt?: string;
  initialSelectedFunctionName?: string;
  initialFunctionPayload?: string;
  trigger?: MessageRole;
  onSubmit: (message: Message) => Promise<void>;
}

export function ChatPromptEditor({
  disabled,
  loading,
  initialPrompt,
  initialSelectedFunctionName,
  initialFunctionPayload,
  onSubmit,
}: ChatPromptEditorProps) {
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

  const recalculateFunctionEditorLineCount = useCallback(() => {
    const newLineCount = model?.getLineCount() || 0;
    if (newLineCount !== functionEditorLineCount) {
      setFunctionEditorLineCount(newLineCount);
    }
  }, [functionEditorLineCount, model]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.currentTarget.value);
  };

  const handleChangeFunctionPayload = (params: string) => {
    setFunctionPayload(params);
    recalculateFunctionEditorLineCount();
  };

  const handleClearSelection = () => {
    setSelectedFunctionName(undefined);
    setFunctionPayload('');
    setPrompt('');
  };

  const handleSelectFunction = (functionName: string) => {
    setPrompt('');
    setFunctionPayload('');
    setSelectedFunctionName(functionName);
  };

  const handleResizeTextArea = () => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current?.scrollHeight + 'px';
    }
  };

  const handleSubmit = useCallback(async () => {
    if (loading || !prompt?.trim()) {
      return;
    }
    const currentPrompt = prompt;
    const currentPayload = functionPayload;

    setPrompt('');
    setFunctionPayload(undefined);
    handleResizeTextArea();

    try {
      if (selectedFunctionName) {
        await onSubmit({
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
        });

        setFunctionPayload(undefined);
        setSelectedFunctionName(undefined);
      } else {
        await onSubmit({
          '@timestamp': new Date().toISOString(),
          message: { role: MessageRole.User, content: currentPrompt },
        });
      }
    } catch (_) {
      setPrompt(currentPrompt);
    }
  }, [functionPayload, loading, onSubmit, prompt, selectedFunctionName]);

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
      textarea.addEventListener('input', handleResizeTextArea, false);
    }

    return () => {
      textarea?.removeEventListener('input', handleResizeTextArea, false);
    };
  });

  return (
    <EuiFocusTrap disabled={!isFocusTrapEnabled}>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiFlexGroup responsive={false}>
                <EuiFlexItem grow>
                  <FunctionListPopover
                    selectedFunctionName={selectedFunctionName}
                    onSelectFunction={handleSelectFunction}
                    disabled={loading || disabled}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {selectedFunctionName ? (
                    <EuiButtonEmpty
                      data-test-subj="observabilityAiAssistantChatPromptEditorEmptySelectionButton"
                      iconType="cross"
                      iconSide="right"
                      size="xs"
                      disabled={loading || disabled}
                      onClick={handleClearSelection}
                    >
                      {i18n.translate('xpack.observabilityAiAssistant.prompt.emptySelection', {
                        defaultMessage: 'Empty selection',
                      })}
                    </EuiButtonEmpty>
                  ) : null}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              {selectedFunctionName ? (
                <EuiPanel borderRadius="none" color="subdued" hasShadow={false} paddingSize="xs">
                  <CodeEditor
                    aria-label="payloadEditor"
                    data-test-subj="observabilityAiAssistantChatPromptEditorCodeEditor"
                    fullWidth
                    height={functionEditorLineCount > 8 ? '200px' : '120px'}
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
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xl" />
          <EuiButtonIcon
            data-test-subj="observabilityAiAssistantChatPromptEditorButtonIcon"
            aria-label="Submit"
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
