/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/monaco';
import React, { useState, useCallback, useEffect } from 'react';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
} from '@elastic/eui';

interface CodeEditorModalProps {
  code: string;
  title: string;
  isOpen: boolean;
  onChange: (code: string) => void;
  onClose: () => void;
}

const suggestionProvider = (
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.CompletionContext
) => {
  const wordUntil = model.getWordUntilPosition(position);
  const wordRange = new monaco.Range(
    position.lineNumber,
    wordUntil.startColumn,
    position.lineNumber,
    wordUntil.endColumn
  );

  return {
    suggestions: [
      {
        label: 'alertsClient',
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: 'alertsClient',
        range: wordRange,
      },
      {
        label: 'alertsClient.create',
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: 'alertsClient.create({\n});',
        range: wordRange,
      },
      {
        label: 'esClient',
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: 'esClient',
        range: wordRange,
      },
      {
        label: 'esClient.search',
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: 'esClient.search({\n});',
        range: wordRange,
      },
      {
        label: 'getTimeRange',
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: 'getTimeRange',
        range: wordRange,
      },
      // {
      //   label: 'report',
      //   kind: monaco.languages.CompletionItemKind.Function,
      //   insertText: 'report',
      //   range: wordRange,
      // },
      // {
      //   label: 'setAlertData',
      //   kind: monaco.languages.CompletionItemKind.Function,
      //   insertText: 'setAlertData',
      //   range: wordRange,
      // },
      // {
      //   label: 'getAlertLimitValue',
      //   kind: monaco.languages.CompletionItemKind.Function,
      //   insertText: 'getAlertLimitValue',
      //   range: wordRange,
      // },
      // {
      //   label: 'setAlertLimitReached',
      //   kind: monaco.languages.CompletionItemKind.Function,
      //   insertText: 'setAlertLimitReached',
      //   range: wordRange,
      // },
      // {
      //   label: 'getRecoveredAlerts',
      //   kind: monaco.languages.CompletionItemKind.Function,
      //   insertText: 'getRecoveredAlerts',
      //   range: wordRange,
      // },
    ],
  };
};

export const CodeEditorModal = (props: CodeEditorModalProps) => {
  const { code, title, onChange, onClose, isOpen } = props;

  const [codeInternal, setCodeInternal] = useState<string>('');

  const onChangeInternal = useCallback((newCode: string) => {
    setCodeInternal(newCode);
  }, []);

  const onCloseInternal = useCallback(() => {
    onChange(codeInternal);
    onClose();
  }, [onChange, onClose, codeInternal]);

  useEffect(() => {
    setCodeInternal(code);
  }, [code]);

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal
      style={{
        width: '800px',
      }}
      onClose={onClose}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <CodeEditor
          languageId="javascript"
          options={{
            lineNumbers: 'on',
            fontSize: 14,
            scrollBeyondLastLine: false,
            folding: true,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
            quickSuggestions: true,
          }}
          value={codeInternal}
          width="100%"
          height="600px"
          onChange={onChangeInternal}
          suggestionProvider={{
            provideCompletionItems: suggestionProvider,
          }}
          allowFullScreen
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onCloseInternal} fill>
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
