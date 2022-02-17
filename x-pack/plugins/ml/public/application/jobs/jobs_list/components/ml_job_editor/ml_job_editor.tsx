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
} from '../../../../../../shared_imports';

export const ML_EDITOR_MODE = { TEXT: 'text', JSON: 'json', XJSON: new XJsonMode() };

interface MlJobEditorProps {
  value: string;
  height?: string;
  width?: string;
  mode?: typeof ML_EDITOR_MODE[keyof typeof ML_EDITOR_MODE];
  readOnly?: boolean;
  syntaxChecking?: boolean;
  theme?: string;
  onChange?: EuiCodeEditorProps['onChange'];
}
export const MLJobEditor: FC<MlJobEditorProps> = ({
  value,
  height = '500px',
  width = '100%',
  mode = ML_EDITOR_MODE.JSON,
  readOnly = false,
  syntaxChecking = true,
  theme = 'textmate',
  onChange = () => {},
}) => {
  if (mode === ML_EDITOR_MODE.XJSON) {
    try {
      value = expandLiteralStrings(value);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
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
