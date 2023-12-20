/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import usePrevious from 'react-use/lib/usePrevious';
import { EuiCode, EuiPanel } from '@elastic/eui';
import { useJsonEditorModel } from '../../hooks/use_json_editor_model';
import { type Message, MessageRole } from '../../../common';

export interface Props {
  functionName: string;
  functionPayload?: string;
  onChange: (message: Message['message']) => void;
}
export function ChatPromptEditorFunction({ functionName, functionPayload, onChange }: Props) {
  const [functionEditorLineCount, setFunctionEditorLineCount] = useState<number>(0);

  const previousPayload = usePrevious(functionPayload);

  const { model, initialJsonString } = useJsonEditorModel({
    functionName,
    initialJson: functionPayload,
  });

  const handleChangeFunctionPayload = (params: string) => {
    recalculateFunctionEditorLineCount();

    onChange({
      role: MessageRole.Assistant,
      content: '',
      function_call: {
        name: functionName,
        trigger: MessageRole.User,
        arguments: params,
      },
    });
  };

  const recalculateFunctionEditorLineCount = useCallback(() => {
    const newLineCount = model?.getLineCount() || 0;
    if (newLineCount !== functionEditorLineCount) {
      setFunctionEditorLineCount(newLineCount + 1);
    }
  }, [functionEditorLineCount, model]);

  useEffect(() => {
    recalculateFunctionEditorLineCount();
  }, [model, recalculateFunctionEditorLineCount]);

  useEffect(() => {
    if (previousPayload === undefined && initialJsonString) {
      onChange({
        role: MessageRole.Assistant,
        content: '',
        function_call: {
          name: functionName,
          trigger: MessageRole.User,
          arguments: initialJsonString,
        },
      });
    }
  }, [functionName, functionPayload, initialJsonString, onChange, previousPayload]);

  return (
    <EuiPanel paddingSize="none">
      <EuiCode>{functionName}</EuiCode>
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
  );
}
