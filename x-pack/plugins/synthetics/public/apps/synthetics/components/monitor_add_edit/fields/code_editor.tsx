/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import styled from 'styled-components';

import { EuiPanel } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { CodeEditor as MonacoCodeEditor } from '@kbn/kibana-react-plugin/public';

import { MonacoEditorLangId } from '../types';

const CodeEditorContainer = styled(EuiPanel)`
  padding: 0;
`;

export interface CodeEditorProps {
  ariaLabel: string;
  id: string;
  languageId: MonacoEditorLangId;
  onChange: (value: string) => void;
  value: string;
  placeholder?: string;
  height?: string;
  readOnly?: boolean;
}

export const CodeEditor = ({
  ariaLabel,
  id,
  languageId,
  onChange,
  value,
  placeholder,
  height = '250px',
  readOnly,
}: CodeEditorProps) => {
  return (
    <CodeEditorContainer borderRadius="none" hasShadow={false} hasBorder={true}>
      <MonacoCodeContainer
        id={`${id}-editor`}
        aria-label={ariaLabel}
        data-test-subj="codeEditorContainer"
      >
        <MonacoCodeEditor
          languageId={languageId}
          width="100%"
          height={height}
          value={value}
          onChange={onChange}
          options={{
            renderValidationDecorations: value ? 'on' : 'off',
            readOnly,
          }}
          isCopyable={true}
          allowFullScreen={true}
          placeholder={placeholder}
        />
      </MonacoCodeContainer>
    </CodeEditorContainer>
  );
};

const MonacoCodeContainer = euiStyled.div`
  & > .kibanaCodeEditor {
    z-index: 0;
  }
`;

export const JSONEditor = (props: any) => {
  return <CodeEditor languageId={MonacoEditorLangId.JSON} {...props} />;
};
