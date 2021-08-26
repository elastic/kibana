/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  memo,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
  ElementRef,
} from 'react';
import { PluggableList } from 'unified';
import { EuiMarkdownEditor, EuiMarkdownEditorUiPlugin } from '@elastic/eui';
import { ContextShape } from '@elastic/eui/src/components/markdown_editor/markdown_context';
import { usePlugins } from './use_plugins';
import { CommentEditorContext } from './context';

interface MarkdownEditorProps {
  ariaLabel: string;
  dataTestSubj?: string;
  editorId: string;
  height?: number;
  onChange: (content: string) => void;
  parsingPlugins?: PluggableList;
  processingPlugins?: PluggableList;
  uiPlugins?: EuiMarkdownEditorUiPlugin[] | undefined;
  value: string;
}

type EuiMarkdownEditorRef = ElementRef<typeof EuiMarkdownEditor>;

export interface MarkdownEditorRef {
  textarea: HTMLTextAreaElement | null;
  replaceNode: ContextShape['replaceNode'];
  toolbar: HTMLDivElement | null;
}

const MarkdownEditorComponent = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ ariaLabel, dataTestSubj, editorId, height, onChange, value }, ref) => {
    const [markdownErrorMessages, setMarkdownErrorMessages] = useState([]);
    const onParse = useCallback((err, { messages }) => {
      setMarkdownErrorMessages(err ? [err] : messages);
    }, []);
    const { parsingPlugins, processingPlugins, uiPlugins } = usePlugins();
    const editorRef = useRef<EuiMarkdownEditorRef>(null);

    const commentEditorContextValue = useMemo(
      () => ({
        editorId,
        value,
      }),
      [editorId, value]
    );

    // @ts-expect-error
    useImperativeHandle(ref, () => {
      if (!editorRef.current) {
        return null;
      }

      const editorNode = editorRef.current?.textarea?.closest('.euiMarkdownEditor');

      return {
        ...editorRef.current,
        toolbar: editorNode?.querySelector('.euiMarkdownEditorToolbar'),
      };
    });

    return (
      <CommentEditorContext.Provider value={commentEditorContextValue}>
        <EuiMarkdownEditor
          ref={editorRef}
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
      </CommentEditorContext.Provider>
    );
  }
);

export const MarkdownEditor = memo(MarkdownEditorComponent);
