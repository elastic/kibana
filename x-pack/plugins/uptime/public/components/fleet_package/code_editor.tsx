/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import styled from 'styled-components';

import { EuiPanel } from '@elastic/eui';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { CodeEditor as MonacoCodeEditor } from '../../../../../../src/plugins/kibana_react/public';

import { MonacoEditorLangId } from './types';

const CodeEditorContainer = styled(EuiPanel)`
  padding: 0;
`;

interface Props {
  ariaLabel: string;
  id: string;
  languageId: MonacoEditorLangId;
  onChange: (value: string) => void;
  value: string;
}

export const CodeEditor = ({ ariaLabel, id, languageId, onChange, value }: Props) => {
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
          height="250px"
          value={value}
          onChange={onChange}
          options={{
            renderValidationDecorations: value ? 'on' : 'off',
          }}
          isCopyable={true}
          allowFullScreen={true}
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
