/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  keys,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { useObservabilityAIAssistant } from '../../hooks/use_observability_ai_assistant';
import { useJsonEditorModel } from '../../hooks/use_json_editor_model';
import { type Message, MessageRole } from '../../../common';
import { FunctionListPopover } from './function_list_popover';

export interface ChatPromptEditorProps {
  disabled: boolean;
  loading: boolean;
  initialPrompt?: string;
  initialSelectedFunctionName?: string;
  initialFunctionPayload?: string;
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
  const { getFunctions } = useObservabilityAIAssistant();
  const functions = getFunctions();

  const [prompt, setPrompt] = useState(initialPrompt);

  const [selectedFunctionName, setSelectedFunctionName] = useState<string | undefined>(
    initialSelectedFunctionName
  );
  const [functionPayload, setFunctionPayload] = useState<string | undefined>(
    initialFunctionPayload
  );

  const { model, initialJsonString } = useJsonEditorModel({
    functionName: selectedFunctionName,
    initialJson: initialFunctionPayload,
  });

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setFunctionPayload(initialJsonString);
  }, [initialJsonString, selectedFunctionName]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.currentTarget.value);
  };

  const handleChangeFunctionPayload = (params: string) => {
    setFunctionPayload(params);
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
            role: MessageRole.Function,
            function_call: {
              name: selectedFunctionName,
              trigger: MessageRole.User,
              arguments: currentPayload,
            },
          },
        });
      } else {
        await onSubmit({
          '@timestamp': new Date().toISOString(),
          message: { role: MessageRole.User, content: currentPrompt },
        });
        setPrompt('');
      }
    } catch (_) {
      setPrompt(currentPrompt);
    }
  }, [functionPayload, onSubmit, prompt, selectedFunctionName]);

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (!event.shiftKey && event.key === keys.ENTER) {
        handleSubmit();
      }
    };

    window.addEventListener('keyup', keyboardListener);

    return () => {
      window.removeEventListener('keyup', keyboardListener);
    };
  }, [handleSubmit]);

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
    <EuiFlexGroup gutterSize="s" responsive={false}>
      <EuiFlexItem grow>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem grow>
                <FunctionListPopover
                  functions={functions}
                  selectedFunctionName={selectedFunctionName}
                  onSelectFunction={handleSelectFunction}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {selectedFunctionName ? (
                  <EuiButtonEmpty
                    iconType="cross"
                    iconSide="right"
                    size="xs"
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
                  fullWidth
                  height="120px"
                  languageId="json"
                  value={functionPayload || ''}
                  onChange={handleChangeFunctionPayload}
                  isCopyable
                  languageConfiguration={{
                    autoClosingPairs: [
                      {
                        open: '{',
                        close: '}',
                      },
                    ],
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
                />
              </EuiPanel>
            ) : (
              <EuiTextArea
                resize="vertical"
                rows={1}
                fullWidth
                placeholder={i18n.translate('xpack.observabilityAiAssistant.prompt.placeholder', {
                  defaultMessage: 'Press ‘$’ for function recommendations',
                })}
                value={prompt}
                inputRef={textAreaRef}
                onChange={handleChange}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xl" />
        <EuiButtonIcon
          aria-label="Submit"
          isLoading={loading}
          disabled={selectedFunctionName ? false : !prompt || loading || disabled}
          display={
            selectedFunctionName ? (functionPayload ? 'fill' : 'base') : prompt ? 'fill' : 'base'
          }
          iconType="kqlFunction"
          size="m"
          onClick={handleSubmit}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
