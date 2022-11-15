/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import styled from 'styled-components';

import type { EuiCodeEditorProps } from '../shared_imports';
import { EuiCodeEditor } from '../shared_imports';

import './osquery_mode';
import 'brace/theme/tomorrow';

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
  commands?: EuiCodeEditorProps['commands'];
}

const ResizeWrapper = styled.div`
  overflow: auto;
  resize: vertical;
  min-height: 100px;
  max-height: 1000px;
  height: 100px;
`;

const OsqueryEditorComponent: React.FC<OsqueryEditorProps> = ({
  defaultValue,
  onChange,
  commands,
}) => {
  const [editorValue, setEditorValue] = useState(defaultValue ?? '');

  useDebounce(() => onChange(editorValue), 500, [editorValue]);

  useEffect(() => setEditorValue(defaultValue), [defaultValue]);

  const resize = useCallback((editorInstance) => {
    document.addEventListener('mouseup', () => editorInstance.resize(), { once: true });
  }, []);

  return (
    <ResizeWrapper>
      <EuiCodeEditor
        value={editorValue}
        mode="osquery"
        onChange={setEditorValue}
        theme="tomorrow"
        name="osquery_editor"
        setOptions={EDITOR_SET_OPTIONS}
        editorProps={EDITOR_PROPS}
        onLoad={resize}
        height="1000px"
        width="100%"
        commands={commands}
      />
    </ResizeWrapper>
  );
};

export const OsqueryEditor = React.memo(OsqueryEditorComponent);
