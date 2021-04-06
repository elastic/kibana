/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState, useCallback, FunctionComponent } from 'react';
import { Plugin, PluggableList } from 'unified';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Options as Remark2RehypeOptions } from 'mdast-util-to-hast';
// eslint-disable-next-line import/no-extraneous-dependencies
import rehype2react from 'rehype-react';
import {
  EuiLinkAnchorProps,
  EuiMarkdownEditor,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  getDefaultEuiMarkdownUiPlugins,
} from '@elastic/eui';

interface MarkdownEditorProps {
  onChange: (content: string) => void;
  value: string;
  ariaLabel: string;
  editorId?: string;
  dataTestSubj?: string;
  height?: number;
}

// create plugin stuff here
export const { uiPlugins, parsingPlugins, processingPlugins } = {
  uiPlugins: getDefaultEuiMarkdownUiPlugins(),
  parsingPlugins: getDefaultEuiMarkdownParsingPlugins(),
  processingPlugins: getDefaultEuiMarkdownProcessingPlugins() as [
    [Plugin, Remark2RehypeOptions],
    [
      typeof rehype2react,
      Parameters<typeof rehype2react>[0] & {
        components: { a: FunctionComponent<EuiLinkAnchorProps> };
      }
    ],
    ...PluggableList
  ],
};

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
