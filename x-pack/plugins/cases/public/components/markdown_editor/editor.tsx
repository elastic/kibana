/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState, useCallback, FunctionComponent } from 'react';
import { Plugin, PluggableList } from 'unified';
// Remove after this issue is resolved: https://github.com/elastic/eui/issues/4688
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
import { EuiMarkdownEditorUiPlugin } from '@elastic/eui';

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

// create plugin stuff here
export const {
  uiPlugins: defaultUiPlugins,
  parsingPlugins: defaultParsingPlugins,
  processingPlugins: defaultProcessingPlugins,
} = {
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
