/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { monaco } from '@kbn/monaco';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export function EQLCodeEditor({ value, onChange }: Props) {
  return (
    <CodeEditor
      value={value}
      height="100px"
      languageId="plaintext"
      languageConfiguration={{
        autoClosingPairs: [
          { open: '"', close: '"' },
          { open: '[', close: ']' },
        ],
        surroundingPairs: [
          { open: '[', close: ']' },
          { open: '"', close: '"' },
        ],
        onEnterRules: [
          {
            beforeText: /\bsequence\b/g,
            action: {
              indentAction: monaco.languages.IndentAction.Indent,
              appendText: '\t [',
            },
          },
        ],
      }}
      options={{
        tabSize: 2,
        automaticLayout: true,
        wordWrap: 'on',
        wrappingIndent: 'indent',
        minimap: {
          enabled: false,
        },
        scrollBeyondLastLine: false,
        quickSuggestions: true,
        lineNumbers: 'off',
      }}
      onChange={onChange}
    />
  );
}
