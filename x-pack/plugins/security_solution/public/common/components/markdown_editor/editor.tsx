/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useCallback } from 'react';
import { EuiMarkdownEditor } from '@elastic/eui';

import { uiPlugins, parsingPlugins, processingPlugins } from './plugins';

interface MarkdownEditorProps {
  onChange: (content: string) => void;
  value: string;
  ariaLabel: string;
  editorId?: string;
  dataTestSubj?: string;
  height?: number;
}

const MarkdownEditorComponent: React.FC<MarkdownEditorProps> = ({
  onChange,
  value,
  ariaLabel,
  editorId,
  dataTestSubj,
  height,
}) => {
  const [markdownErrorMessages, setMarkdownErrorMessages] = useState([]);
  const onParse = useCallback((err, { messages }) => {
    setMarkdownErrorMessages(err ? [err] : messages);
  }, []);

  return (
    <EuiMarkdownEditor
      aria-label={ariaLabel}
      editorId={editorId}
      onChange={onChange}
      value={value}
      uiPlugins={uiPlugins}
      parsingPluginList={parsingPlugins}
      processingPluginList={processingPlugins}
      onParse={onParse}
      errors={markdownErrorMessages}
      data-test-subj={dataTestSubj}
      height={height}
    />
  );
};

export const MarkdownEditor = memo(MarkdownEditorComponent);
