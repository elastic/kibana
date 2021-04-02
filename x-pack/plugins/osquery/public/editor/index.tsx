/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
  disabled?: boolean;
  onChange: (newValue: string) => void;
}

const OsqueryEditorComponent: React.FC<OsqueryEditorProps> = ({
  defaultValue,
  // disabled,
  onChange,
}) => (
  <EuiCodeEditor
    value={defaultValue}
    mode="osquery"
    // isReadOnly={disabled}
    theme="tomorrow"
    onChange={onChange}
    name="osquery_editor"
    setOptions={EDITOR_SET_OPTIONS}
    editorProps={EDITOR_PROPS}
    height="200px"
    width="100%"
  />
);

export const OsqueryEditor = React.memo(OsqueryEditorComponent);
