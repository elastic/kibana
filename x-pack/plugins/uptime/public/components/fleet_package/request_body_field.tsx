/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { stringify, parse } from 'query-string';

import styled from 'styled-components';

import { EuiCodeEditor, EuiPanel, EuiTabbedContent } from '@elastic/eui';
import { ConfigKeys, Mode } from './types';

import { KeyValuePairsField, Pair } from './key_value_field';

import 'brace/theme/github';
import 'brace/mode/javascript';
import 'brace/snippets/javascript';
import 'brace/ext/language_tools';

const CodeEditorContainer = styled(EuiPanel)`
  padding: 0;
`;

const CodeEditor = ({
  mode,
  onChange,
  value,
}: {
  mode: Mode;
  onChange: (value: string) => void;
  value: string;
}) => {
  return (
    <CodeEditorContainer borderRadius="none">
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
        aria-label="Request body"
      />
    </CodeEditorContainer>
  );
};

interface Props {
  configKey: ConfigKeys;
  onChange: (requestBody: { type: Mode; value: string }) => void;
  type: Mode;
  value: string;
}

// TO DO: Look into whether or not code editor reports errors, in order to prevent form submission on an error
export const RequestBodyField = ({ onChange, type, value }: Props) => {
  const modeKeys = Object.values(Mode) as Mode[];
  const defaultValues = modeKeys.reduce((acc: Record<string, string>, modeKey: Mode) => {
    if (type === modeKey) {
      acc[modeKey] = value;
    } else {
      acc[modeKey] = '';
    }
    return acc;
  }, {});
  const [values, setValues] = useState<Record<Mode, string>>(defaultValues);

  useEffect(() => {
    onChange({
      type,
      value: values[type],
    });
  }, [onChange, type, values]);

  const handleSetMode = useCallback(
    (currentMode: Mode) => {
      onChange({
        type: currentMode,
        value: values[currentMode],
      });
    },
    [onChange, values]
  );

  const onChangeFormFields = useCallback(
    (pairs: Pair[]) => {
      const formattedPairs = pairs.reduce((acc: Record<string, string>, header) => {
        const [key, pairValue, checked] = header;
        if (checked) {
          return {
            ...acc,
            [key]: pairValue,
          };
        }
        return acc;
      }, {});
      return setValues((prevValues) => ({
        ...prevValues,
        [Mode.FORM]: stringify(formattedPairs),
      }));
    },
    [setValues]
  );

  const defaultFormPairs: Pair[] = useMemo(() => {
    const pairs = parse(values[Mode.FORM]);
    const keys = Object.keys(pairs);
    if (keys.length) {
      const formattedPairs: Pair[] = keys.map((key: string) => {
        // key, value, checked;
        return [key, `${pairs[key]}`, true];
      });
      return formattedPairs;
    } else {
      return [['', '', false]];
    }
  }, [values]);

  const tabs = [
    {
      id: Mode.TEXT,
      name: modeLabels[Mode.TEXT],
      content: (
        <CodeEditor
          mode={Mode.TEXT}
          onChange={(code) => setValues((prevValues) => ({ ...prevValues, [Mode.TEXT]: code }))}
          value={values[Mode.TEXT]}
        />
      ),
    },
    {
      id: Mode.JSON,
      name: modeLabels[Mode.JSON],
      content: (
        <CodeEditor
          mode={Mode.JSON}
          onChange={(code) => setValues((prevValues) => ({ ...prevValues, [Mode.JSON]: code }))}
          value={values[Mode.JSON]}
        />
      ),
    },
    {
      id: Mode.XML,
      name: modeLabels[Mode.XML],
      content: (
        <CodeEditor
          mode={Mode.XML}
          onChange={(code) => setValues((prevValues) => ({ ...prevValues, [Mode.XML]: code }))}
          value={values[Mode.XML]}
        />
      ),
    },
    {
      id: Mode.FORM,
      name: modeLabels[Mode.FORM],
      content: <KeyValuePairsField defaultPairs={defaultFormPairs} onChange={onChangeFormFields} />,
    },
  ];

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs.find((tab) => tab.id === type)}
      autoFocus="selected"
      onTabClick={(tab) => handleSetMode(tab.id as Mode)}
    />
  );
};

const modeLabels = {
  [Mode.FORM]: 'Form',
  [Mode.TEXT]: 'Text',
  [Mode.JSON]: 'JSON',
  [Mode.XML]: 'XML',
};
