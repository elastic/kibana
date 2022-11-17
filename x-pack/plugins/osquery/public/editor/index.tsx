/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
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

const ResizeWrapper = styled.div<{ height: number; minHeight: number }>`
  overflow: auto;
  resize: vertical;
  height: ${(props) => props.height};
  min-height: ${(props) => props.minHeight};
`;

const MIN_HEIGHT = 100;
const OsqueryEditorComponent: React.FC<OsqueryEditorProps> = ({
  defaultValue,
  onChange,
  commands,
}) => {
  const [editorValue, setEditorValue] = useState(defaultValue ?? '');
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [minHeight, setMinHeight] = useState(MIN_HEIGHT);
  const editorRef = useRef<{ renderer: { layerConfig: { maxHeight: number; minHeight: number } } }>(
    {
      renderer: { layerConfig: { maxHeight: 100, minHeight: 100 } },
    }
  );

  useDebounce(() => onChange(editorValue), 500, [editorValue]);

  useEffect(() => {
    const config = editorRef.current?.renderer.layerConfig;

    if (config.maxHeight > MIN_HEIGHT) {
      setHeight(config.maxHeight);
    }

    if (config.maxHeight < config.minHeight) {
      setMinHeight(config.maxHeight);
    }
  }, [editorRef.current.renderer.layerConfig]);

  useEffect(() => setEditorValue(defaultValue), [defaultValue]);

  const resizeEditor = useCallback((editorInstance) => {
    editorRef.current.renderer = editorInstance.renderer;

    setTimeout(() => {
      const { maxHeight } = editorInstance.renderer.layerConfig;
      if (maxHeight > MIN_HEIGHT) {
        setHeight(maxHeight);
      }
    }, 0);

    document.addEventListener('mouseup', () => editorInstance.resize(), { once: true });
  }, []);

  return (
    <ResizeWrapper height={height} minHeight={minHeight}>
      <EuiCodeEditor
        value={editorValue}
        mode="osquery"
        onChange={setEditorValue}
        theme="tomorrow"
        name="osquery_editor"
        setOptions={EDITOR_SET_OPTIONS}
        editorProps={EDITOR_PROPS}
        onLoad={resizeEditor}
        height={height + 'px'}
        width="100%"
        commands={commands}
      />
    </ResizeWrapper>
  );
};

export const OsqueryEditor = React.memo(OsqueryEditorComponent);
