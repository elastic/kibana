/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCodeEditor } from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import 'brace/theme/tomorrow';

import './osquery_mode.ts';

const EDITOR_SET_OPTIONS = {
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: true,
};

const EDITOR_PROPS = {
  $blockScrolling: true,
};

interface OsqueryEditorProps {
  defaultValue: string;
  onChange: (newValue: string) => void;
}

const OsqueryEditorComponent: React.FC<OsqueryEditorProps> = ({ defaultValue, onChange }) => {
  const [editorValue, setEditorValue] = useState(defaultValue ?? '');

  useDebounce(() => onChange(editorValue.replaceAll('\n', ' ').replaceAll('  ', ' ')), 500, [
    editorValue,
  ]);

  useEffect(() => setEditorValue(defaultValue), [defaultValue]);

  return (
    <EuiCodeEditor
      value={editorValue}
      mode="osquery"
      onChange={setEditorValue}
      theme="tomorrow"
      name="osquery_editor"
      setOptions={EDITOR_SET_OPTIONS}
      editorProps={EDITOR_PROPS}
      height="150px"
      width="100%"
    />
  );
};

export const OsqueryEditor = React.memo(OsqueryEditorComponent);
