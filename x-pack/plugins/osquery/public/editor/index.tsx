/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import AceEditor from 'react-ace';

import 'ace-builds/src-min-noconflict/ext-searchbox';
import 'ace-builds/src-min-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-tomorrow';

const EDITOR_SET_OPTIONS = {
  enableBasicAutocompletion: true,
  // useWorker: false,
};

const OsqueryEditorComponent = () => {
  const onChange = useCallback((newValue) => {
    console.log('change', newValue);
  }, []);

  return (
    <AceEditor
      mode="sql"
      theme="tomorrow"
      onChange={onChange}
      name="osquery_editor"
      setOptions={EDITOR_SET_OPTIONS}
      editorProps={{ $blockScrolling: true }}
    />
  );
};

export const OsqueryEditor = React.memo(OsqueryEditorComponent);
