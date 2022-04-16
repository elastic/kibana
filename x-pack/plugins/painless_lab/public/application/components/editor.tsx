/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PainlessLang, PainlessContext } from '@kbn/monaco';

import { CodeEditor } from '@kbn/kibana-react-plugin/public';

interface Props {
  code: string;
  onChange: (code: string) => void;
  context: PainlessContext;
}

export function Editor({ code, onChange, context }: Props) {
  const suggestionProvider = PainlessLang.getSuggestionProvider(context);

  return (
    <CodeEditor
      languageId={PainlessLang.ID}
      // 99% width allows the editor to resize horizontally. 100% prevents it from resizing.
      width="99%"
      height="100%"
      value={code}
      onChange={onChange}
      suggestionProvider={suggestionProvider}
      options={{
        fontSize: 12,
        minimap: {
          enabled: false,
        },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        wrappingIndent: 'indent',
        automaticLayout: true,
        suggest: {
          snippetsPreventQuickSuggestions: false,
        },
      }}
    />
  );
}
