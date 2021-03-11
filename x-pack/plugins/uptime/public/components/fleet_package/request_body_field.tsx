/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import styled from 'styled-components';

import { EuiCodeEditor, EuiPanel, EuiTabs, EuiTab } from '@elastic/eui';
import 'brace/theme/github';
import 'brace/mode/javascript';
import 'brace/snippets/javascript';
import 'brace/ext/language_tools';

import { ConfigKeys, Mode, IHTTPAdvancedFields } from './types';

interface Props {
  setFields: React.Dispatch<React.SetStateAction<IHTTPAdvancedFields>>;
  type: Mode;
  value: string;
}

const CodeEditorContainer = styled(EuiPanel)`
  padding: 0;
`;

// TO DO: Look into whether or not code editor reports errors, in order to prevent form submission on an error
export const RequestBodyField = ({ setFields, type, value }: Props) => {
  const handleSetMode = useCallback(
    (currentMode: Mode) => {
      setFields((prevFields) => ({
        ...prevFields,
        [ConfigKeys.REQUEST_BODY_CHECK]: {
          type: currentMode,
          value,
        },
      }));
    },
    [setFields, value]
  );

  const onChange = useCallback(
    (currentValue: string) => {
      setFields((prevFields) => ({
        ...prevFields,
        [ConfigKeys.REQUEST_BODY_CHECK]: {
          type,
          value: currentValue,
        },
      }));
    },
    [setFields, type]
  );

  const modeKeys = Object.keys(modeLabels) as Mode[];

  return (
    <>
      <EuiTabs>
        {modeKeys.map((key) => (
          <EuiTab key={key} isSelected={type === key} onClick={() => handleSetMode(key)}>
            {modeLabels[key]}
          </EuiTab>
        ))}
      </EuiTabs>
      <CodeEditorContainer borderRadius="none">
        <EuiCodeEditor
          mode={type}
          theme="github"
          width="100%"
          height="250px"
          value={value}
          onChange={onChange}
          setOptions={{
            fontSize: '14px',
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true,
          }}
          aria-label="Request body"
        />
      </CodeEditorContainer>
    </>
  );
};

const modeLabels = {
  [Mode.TEXT]: 'Text',
  [Mode.JSON]: 'JSON',
  [Mode.XML]: 'XML',
};
