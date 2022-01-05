/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import { i18n } from '@kbn/i18n';
import { EuiCodeBlock, EuiTextColor } from '@elastic/eui';

import { CodeEditor } from '../../../../../../../../../../src/plugins/kibana_react/public';
import type { CodeEditorProps } from '../../../../../../../../../../src/plugins/kibana_react/public';

const CodeEditorContainer = styled.div`
  min-height: 0;
  position: relative;
  height: 116px;
`;

const CodeEditorPlaceholder = styled(EuiTextColor).attrs((props) => ({
  color: 'subdued',
  size: 'xs',
}))`
  position: absolute;
  top: 0;
  left: 0;
  // Matches monaco editor
  font-family: Menlo, Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 21px;
  pointer-events: none;
`;

const CODE_EDITOR_OPTIONS: CodeEditorProps['options'] = {
  minimap: {
    enabled: false,
  },

  ariaLabel: i18n.translate('xpack.fleet.settings.yamlCodeEditor', {
    defaultMessage: 'YAML Code Editor',
  }),
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  wrappingIndent: 'indent',
  automaticLayout: true,
  tabSize: 2,
  // To avoid left margin
  lineNumbers: 'off',
  lineNumbersMinChars: 0,
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 0,
};

export type YamlCodeEditorWithPlaceholderProps = Pick<CodeEditorProps, 'value' | 'onChange'> & {
  placeholder: string;
  disabled?: boolean;
};

export const YamlCodeEditorWithPlaceholder: React.FunctionComponent<
  YamlCodeEditorWithPlaceholderProps
> = (props) => {
  const { placeholder, disabled, ...editorProps } = props;

  if (disabled) {
    return (
      <EuiCodeBlock style={{ height: '116px' }} language="yaml" isCopyable={false} paddingSize="s">
        <pre>{editorProps.value}</pre>
      </EuiCodeBlock>
    );
  }

  return (
    <CodeEditorContainer>
      <CodeEditor
        languageId="yaml"
        width="100%"
        height="116px"
        options={CODE_EDITOR_OPTIONS}
        {...editorProps}
      />
      {(!editorProps.value || editorProps.value === '') && (
        <CodeEditorPlaceholder>{placeholder}</CodeEditorPlaceholder>
      )}
    </CodeEditorContainer>
  );
};
