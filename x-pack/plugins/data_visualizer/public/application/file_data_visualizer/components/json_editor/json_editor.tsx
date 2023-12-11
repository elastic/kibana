/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { CodeEditor, type CodeEditorProps } from '@kbn/kibana-react-plugin/public';
import { expandLiteralStrings, XJsonMode } from '../../../shared_imports';

export const EDITOR_MODE = { TEXT: 'text', JSON: 'json', XJSON: new XJsonMode() };

interface JobEditorProps {
  value: string;
  height?: string;
  width?: string;
  mode?: typeof EDITOR_MODE[keyof typeof EDITOR_MODE];
  readOnly?: boolean;
  onChange?: CodeEditorProps['onChange'];
}
export const JsonEditor: FC<JobEditorProps> = ({
  value,
  height = '500px',
  // 99% width allows the editor to resize horizontally. 100% prevents it from resizing.
  width = '99%',
  mode = EDITOR_MODE.JSON,
  readOnly = false,
  onChange = () => {},
}) => {
  if (mode === EDITOR_MODE.XJSON) {
    value = expandLiteralStrings(value);
  }

  return (
    <CodeEditor
      value={value}
      width={width}
      height={height}
      languageId={mode}
      languageConfiguration={{
        autoClosingPairs: [
          {
            open: '{',
            close: '}',
          },
        ],
      }}
      options={{
        tabSize: 2,
        readOnly,
        automaticLayout: true,
        wordWrap: 'on',
        wrappingIndent: 'indent',
        minimap: {
          enabled: false,
        },
        scrollBeyondLastLine: false,
        quickSuggestions: true,
      }}
      onChange={onChange}
    />
  );
};
