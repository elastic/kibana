/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, forwardRef, useRef, useState, useImperativeHandle } from 'react';
import { PluggableList } from 'unified';
import { EuiMarkdownEditor, EuiMarkdownEditorUiPlugin } from '@elastic/eui';
import { usePlugins } from './use_plugins';
import { useLensContext } from '../lens_context/use_lens_context';

interface MarkdownEditorProps {
  ariaLabel: string;
  dataTestSubj?: string;
  editorId?: string;
  height?: number;
  onChange: (content: string) => void;
  parsingPlugins?: PluggableList;
  processingPlugins?: PluggableList;
  uiPlugins?: EuiMarkdownEditorUiPlugin[] | undefined;
  value: string;
}

const MarkdownEditorComponent: React.FC<MarkdownEditorProps> = forwardRef(
  ({ ariaLabel, dataTestSubj, editorId, height, onChange, value }, ref) => {
    const [markdownErrorMessages, setMarkdownErrorMessages] = useState([]);

    const { parsingPlugins, processingPlugins, uiPlugins } = usePlugins();
    const LensContextProvider = useLensContext()?.editor_context.Provider;
    const editorRef = useRef(null);

    console.error('useRef', ref?.current);

    useImperativeHandle(ref, () => {
      console.error('reft', ref, editorRef);
      return {
        ...editorRef.current,
        toolbar: editorRef.current.textarea
          .closest('.euiMarkdownEditor')
          .querySelector('.euiMarkdownEditorToolbar'),
      };
    });

    const editor = (
      <EuiMarkdownEditor
        ref={editorRef}
        aria-label={ariaLabel}
        editorId={editorId}
        onChange={onChange}
        value={value}
        uiPlugins={uiPlugins}
        parsingPluginList={parsingPlugins}
        processingPluginList={processingPlugins}
        errors={markdownErrorMessages}
        data-test-subj={dataTestSubj}
        height={height}
      />
    );

    if (LensContextProvider) {
      return (
        <LensContextProvider
          value={{
            editorId,
            onChange,
            value,
          }}
        >
          {editor}
        </LensContextProvider>
      );
    }

    return editor;
  }
);

export const MarkdownEditor = memo(MarkdownEditorComponent);
