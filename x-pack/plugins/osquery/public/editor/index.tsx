/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import { EuiCodeEditor } from '@elastic/eui';
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
  const editorValue = useRef(defaultValue ?? '');

  const handleChange = useCallback((newValue: string) => {
    editorValue.current = newValue;
  }, []);

  const onBlur = useCallback(() => {
    onChange(editorValue.current.replaceAll('\n', ' ').replaceAll('  ', ' '));
  }, [onChange]);

  return (
    <EuiCodeEditor
      onBlur={onBlur}
      value={defaultValue}
      mode="osquery"
      onChange={handleChange}
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
