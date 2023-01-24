/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'brace/ext/language_tools';
import { last } from 'lodash';
import React, { useRef } from 'react';
import { EuiCodeEditor } from '@kbn/es-ui-shared-plugin/public';
import { EQLCodeEditorCompleter } from './completer';
import { EQL_THEME_NAME } from './constants';
import { EQLMode } from './eql_mode';
import './theme';
import { EQLCodeEditorProps } from './types';

export function EQLCodeEditor(props: EQLCodeEditorProps) {
  const {
    showGutter = false,
    setOptions,
    getSuggestions,
    ...restProps
  } = props;

  const completer = useRef(new EQLCodeEditorCompleter());
  const eqlMode = useRef(new EQLMode());

  completer.current.setSuggestionCb(getSuggestions);

  const options = {
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    wrap: true,
    ...setOptions,
  };

  return (
    <div className="euiTextArea" style={{ maxWidth: 'none' }}>
      <EuiCodeEditor
        showGutter={showGutter}
        mode={eqlMode.current}
        theme={last(EQL_THEME_NAME.split('/'))}
        setOptions={options}
        onAceEditorRef={(editor) => {
          if (editor) {
            editor.editor.completers = [completer.current];
          }
        }}
        {...restProps}
      />
    </div>
  );
}
