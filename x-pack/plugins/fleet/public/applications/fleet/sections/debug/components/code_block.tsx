/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CodeEditor } from '@kbn/kibana-react-plugin/public';

/**
 * A read-only code block with various default settings suitable for displaying API responses, etc
 */
export const CodeBlock: React.FunctionComponent<{ value: string }> = ({ value }) => {
  return (
    <CodeEditor
      isCopyable
      languageId=""
      height="600px"
      width="100%"
      options={{
        minimap: {
          enabled: false,
        },
        scrollBeyondLastLine: false,
        readOnly: true,
        tabSize: 2,
        lineNumbers: 'off',
        lineNumbersMinChars: 0,
        glyphMargin: false,
        lineDecorationsWidth: 0,
        overviewRulerBorder: false,
      }}
      value={value}
    />
  );
};
