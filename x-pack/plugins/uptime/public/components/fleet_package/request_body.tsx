/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { EuiCodeEditor, EuiFilterGroup, EuiFilterButton } from '@elastic/eui';
import 'brace/theme/github';
import 'brace/mode/javascript';
import 'brace/snippets/javascript';
import 'brace/ext/language_tools';

import { ConfigKeys, ContentType, ICustomFields } from './types';

interface Props {
  fields: ICustomFields;
  setFields: React.Dispatch<React.SetStateAction<ICustomFields>>;
}

// TO DO: Look into whether or not code editor reports errors, in order to prevent form submission on an error
export const RequestBody = ({ fields, setFields }: Props) => {
  const [mode, setMode] = useState<Mode>(Mode.TEXT);
  const { type, value } = fields[ConfigKeys.REQUEST_BODY_CHECK];
  const handleSetMode = useCallback(
    (currentMode: Mode) => {
      setMode(currentMode);
      setFields((prevFields) => ({
        ...prevFields,
        [ConfigKeys.REQUEST_BODY_CHECK]: {
          type: contentTypes[currentMode],
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
      <EuiFilterGroup fullWidth>
        {modeKeys.map((key) => (
          <EuiFilterButton
            key={key}
            hasActiveFilters={mode === key}
            onClick={() => handleSetMode(key)}
          >
            {modeLabels[key]}
          </EuiFilterButton>
        ))}
      </EuiFilterGroup>
      <EuiCodeEditor
        mode={mode}
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
        aria-label="Request Body"
      />
    </>
  );
};

enum Mode {
  JSON = 'json',
  TEXT = 'text',
  XML = 'xml',
}

const contentTypes: Record<Mode, ContentType> = {
  [Mode.JSON]: ContentType.JSON,
  [Mode.TEXT]: ContentType.TEXT,
  [Mode.XML]: ContentType.XML,
};

const modeLabels = {
  [Mode.TEXT]: 'Text',
  [Mode.JSON]: 'JSON',
  [Mode.XML]: 'XML',
};
