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
import { ConfigKeys, Mode, IHTTPAdvancedFields } from './types';

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
  setFields: React.Dispatch<React.SetStateAction<IHTTPAdvancedFields>>;
  type: Mode;
  value: string;
}

// TO DO: Look into whether or not code editor reports errors, in order to prevent form submission on an error
export const RequestBodyField = ({ configKey, setFields, type, value }: Props) => {
  const modeKeys = Object.keys(Mode) as Mode[];
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
    setFields((prevFields) => ({
      ...prevFields,
      [configKey]: {
        type,
        value: values[type],
      },
    }));
  }, [configKey, setFields, type, values]);

  const handleSetMode = useCallback(
    (currentMode: Mode) => {
      setFields((prevFields) => ({
        ...prevFields,
        [configKey]: {
          type: currentMode,
          value: values[currentMode],
        },
      }));
    },
    [configKey, setFields, values]
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
      id: modeLabels[Mode.FORM],
      name: 'Form',
      content: (
        <KeyValuePairsField
          configKey={ConfigKeys.RESPONSE_HEADERS_CHECK}
          defaultPairs={defaultFormPairs}
          onChange={onChangeFormFields}
        />
      ),
    },
  ];

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs[0]}
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
