/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState, useCallback } from 'react';
import { PluggableList } from 'unified';
import { EuiMarkdownEditor } from '@elastic/eui';
import { EuiMarkdownEditorUiPlugin } from '@elastic/eui';
import { defaultParsingPlugins, defaultProcessingPlugins, defaultUiPlugins } from './plugins';

interface MarkdownEditorProps {
  ariaLabel: string;
  dataTestSubj?: string;
  editorId?: string;
  height?: number;
  onChange: (content: string) => void;
  parsingPlugins?: PluggableList;
  processingPlugins?: PluggableList;
  uiPlugins?: Array<EuiMarkdownEditorUiPlugin<any>> | undefined;
  value: string;
}

const MarkdownEditorComponent: React.FC<MarkdownEditorProps> = ({
  ariaLabel,
  dataTestSubj,
  editorId,
  height,
  onChange,
  parsingPlugins,
  processingPlugins,
  uiPlugins,
  value,
}) => {
  const [markdownErrorMessages, setMarkdownErrorMessages] = useState([]);
  const onParse = useCallback((err, { messages }) => {
    setMarkdownErrorMessages(err ? [err] : messages);
  }, []);

  useEffect(
    () => document.querySelector<HTMLElement>('textarea.euiMarkdownEditorTextArea')?.focus(),
    []
  );

  return (
    <EuiMarkdownEditor
      aria-label={ariaLabel}
      editorId={editorId}
      onChange={onChange}
      value={value}
      uiPlugins={uiPlugins ?? defaultUiPlugins}
      parsingPluginList={parsingPlugins ?? defaultParsingPlugins}
      processingPluginList={processingPlugins ?? defaultProcessingPlugins}
      onParse={onParse}
      errors={markdownErrorMessages}
      data-test-subj={dataTestSubj}
      height={height}
    />
  );
};

export const MarkdownEditor = memo(MarkdownEditorComponent);
