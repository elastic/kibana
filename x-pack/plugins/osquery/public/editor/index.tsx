/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import type { monaco } from '@kbn/monaco';
import type { EuiCodeEditorProps } from '../shared_imports';

import { initializeOsqueryEditor } from './osquery_highlight_rules';

interface OsqueryEditorProps {
  defaultValue: string;
  onChange: (newValue: string) => void;
  commands?: EuiCodeEditorProps['commands'];
}

const MIN_HEIGHT = 100;
const OsqueryEditorComponent: React.FC<OsqueryEditorProps> = ({
  defaultValue,
  onChange,
  commands,
}) => {
  const [editorValue, setEditorValue] = useState(defaultValue ?? '');
  const [height, setHeight] = useState(MIN_HEIGHT);

  useDebounce(
    () => {
      onChange(editorValue);
    },
    500,
    [editorValue]
  );

  useEffect(() => setEditorValue(defaultValue), [defaultValue]);

  const editorOptions = useMemo(
    () => ({
      theme: 'osquery',
      automaticLayout: true,
    }),
    []
  );

  useEffect(() => {
    const disposable = initializeOsqueryEditor();

    return () => {
      disposable?.dispose();
    };
  }, []);

  const editorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const minHeight = 100;
    const maxHeight = 1000;

    const updateHeight = () => {
      const contentHeight = Math.min(maxHeight, Math.max(minHeight, editor.getContentHeight()));
      setHeight(contentHeight);
    };

    editor.onDidContentSizeChange(updateHeight);
  }, []);

  //
  return (
    <CodeEditor
      languageId={'sql'}
      value={editorValue}
      onChange={setEditorValue}
      options={editorOptions}
      height={height + 'px'}
      width="100%"
      // TODO AFAIK Monaco doesnt support commands, will try to figure it out next
      // commands={commands}
      editorDidMount={editorDidMount}
    />
  );
};

export const OsqueryEditor = React.memo(OsqueryEditorComponent);
