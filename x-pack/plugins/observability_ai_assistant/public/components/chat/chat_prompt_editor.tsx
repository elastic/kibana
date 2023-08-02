/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Ref, useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFieldText,
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
import type { FunctionDefinition } from '../../../common/types';
import { FunctionListPopover } from './function_list_popover';

export interface ChatPromptEditorProps {
  disabled: boolean;
  loading: boolean;
  onSubmit: (message: Message) => Promise<void>;
}

export function ChatPromptEditor({ onSubmit, disabled, loading }: ChatPromptEditorProps) {
  const { getFunctions } = useObservabilityAIAssistant();
  const functions = getFunctions();

  const [prompt, setPrompt] = useState('');
  const [functionPayload, setFunctionPayload] = useState<string | undefined>('');
  const [selectedFunction, setSelectedFunction] = useState<FunctionDefinition | undefined>();

  const { model, initialJsonString } = useJsonEditorModel(selectedFunction);

  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFunctionPayload(initialJsonString);
  }, [initialJsonString, selectedFunction]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(event.currentTarget.value);
  };

  const handleChangeFunctionPayload = (params: string) => {
    setFunctionPayload(params);
  };

  const handleClearSelection = () => {
    setSelectedFunction(undefined);
    setFunctionPayload('');
  };

  const handleSubmit = useCallback(async () => {
    const currentPrompt = prompt;
    const currentPayload = functionPayload;

    setPrompt('');
    setFunctionPayload(undefined);

    try {
      if (selectedFunction) {
        await onSubmit({
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.Function,
            function_call: {
              name: selectedFunction.options.name,
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
  }, [functionPayload, onSubmit, prompt, selectedFunction]);

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (event.key === keys.ENTER) {
        handleSubmit();
      }
    };

    window.addEventListener('keyup', keyboardListener);

    return () => {
      window.removeEventListener('keyup', keyboardListener);
    };
  }, [handleSubmit]);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
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
                  selectedFunction={selectedFunction}
                  onSelectFunction={setSelectedFunction}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {selectedFunction ? (
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
            {selectedFunction ? (
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
              <EuiFieldText
                fullWidth
                value={prompt}
                placeholder={i18n.translate('xpack.observabilityAiAssistant.prompt.placeholder', {
                  defaultMessage: 'Press ‘$’ for function recommendations',
                })}
                inputRef={ref}
                onChange={handleChange}
                onSubmit={handleSubmit}
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
          disabled={selectedFunction ? false : !prompt || loading || disabled}
          display={prompt ? 'fill' : 'base'}
          iconType="kqlFunction"
          size="m"
          onClick={handleSubmit}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
