/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import {
  expandLiteralStrings,
  XJsonMode,
  EuiCodeEditor,
  EuiCodeEditorProps,
} from '../../../shared_imports';

export const EDITOR_MODE = { TEXT: 'text', JSON: 'json', XJSON: new XJsonMode() };

interface JobEditorProps {
  value: string;
  height?: string;
  width?: string;
  mode?: typeof EDITOR_MODE[keyof typeof EDITOR_MODE];
  readOnly?: boolean;
  syntaxChecking?: boolean;
  theme?: string;
  onChange?: EuiCodeEditorProps['onChange'];
}
export const JsonEditor: FC<JobEditorProps> = ({
  value,
  height = '500px',
  width = '100%',
  mode = EDITOR_MODE.JSON,
  readOnly = false,
  syntaxChecking = true,
  theme = 'textmate',
  onChange = () => {},
}) => {
  if (mode === EDITOR_MODE.XJSON) {
    value = expandLiteralStrings(value);
  }

  return (
    <EuiCodeEditor
      value={value}
      width={width}
      height={height}
      mode={mode}
      readOnly={readOnly}
      wrapEnabled={true}
      showPrintMargin={false}
      theme={theme}
      editorProps={{ $blockScrolling: true }}
      setOptions={{
        useWorker: syntaxChecking,
        tabSize: 2,
        useSoftTabs: true,
      }}
      onChange={onChange}
    />
  );
};
