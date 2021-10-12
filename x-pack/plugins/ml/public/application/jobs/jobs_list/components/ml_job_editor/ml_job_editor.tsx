/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiCodeBlock } from '@elastic/eui';
import { expandLiteralStrings, XJsonMode } from '../../../../../../shared_imports';
import {
  CodeEditor,
  CodeEditorProps,
} from '../../../../../../../../../src/plugins/kibana_react/public';

export const ML_EDITOR_MODE = { TEXT: 'text', JSON: 'json', XJSON: new XJsonMode() };

interface MlJobEditorProps {
  value: string;
  height?: string;
  width?: string;
  mode?: typeof ML_EDITOR_MODE[keyof typeof ML_EDITOR_MODE];
  readOnly?: boolean;
  onChange?: CodeEditorProps['onChange'];
}
export const MLJobEditor: FC<MlJobEditorProps> = ({
  value,
  height = '500px',
  width = '100%',
  mode = ML_EDITOR_MODE.JSON,
  readOnly = false,
  onChange = () => {},
}) => {
  if (mode === ML_EDITOR_MODE.XJSON) {
    value = expandLiteralStrings(value);
  }

  return readOnly ? (
    <EuiCodeBlock
      style={{ width, height }}
      language={mode}
      fontSize="s"
      paddingSize="s"
      transparentBackground={true}
    >
      {value}
    </EuiCodeBlock>
  ) : (
    <CodeEditor
      options={{
        automaticLayout: false,
        wordWrap: 'on',
        wrappingIndent: 'indent',
        fontSize: 12,
        scrollBeyondLastLine: false,
        minimap: {
          enabled: false,
        },
        highlightActiveIndentGuide: false,
      }}
      value={value}
      width={width}
      height={height}
      languageId={mode}
      onChange={onChange}
    />
  );
};
