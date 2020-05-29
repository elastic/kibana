/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Monaco } from '../../../../../../src/plugins/es_ui_shared/public';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  code: string;
  onChange: (code: string) => void;
}

export function Editor({ code, onChange }: Props) {
  const { XJsonLang, xJson, convertToJson, setXJson } = Monaco.useXJsonMode(code);
  return (
    <CodeEditor
      languageId={XJsonLang.ID}
      // 99% width allows the editor to resize horizontally. 100% prevents it from resizing.
      width="99%"
      height="100%"
      editorDidMount={(editor) => {
        XJsonLang.registerGrammarChecker(editor);
      }}
      value={xJson}
      onChange={(value) => {
        setXJson(value);
        onChange(value);
      }}
      options={{
        fontSize: 12,
        minimap: {
          enabled: false,
        },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        wrappingIndent: 'indent',
        automaticLayout: true,
      }}
    />
  );
}
