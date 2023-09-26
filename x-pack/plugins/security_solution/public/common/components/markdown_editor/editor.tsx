/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElementRef } from 'react';
import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { EuiMarkdownEditor } from '@elastic/eui';
import type { ContextShape } from '@elastic/eui/src/components/markdown_editor/markdown_context';

import { uiPlugins, parsingPlugins, processingPlugins } from './plugins';
import { useUpsellingMessage } from '../../hooks/use_upselling';

interface MarkdownEditorProps {
  onChange: (content: string) => void;
  value: string;
  ariaLabel: string;
  editorId?: string;
  dataTestSubj?: string;
  height?: number;
  autoFocusDisabled?: boolean;
  setIsMarkdownInvalid: (value: boolean) => void;
}

type EuiMarkdownEditorRef = ElementRef<typeof EuiMarkdownEditor>;

export interface MarkdownEditorRef {
  textarea: HTMLTextAreaElement | null;
  replaceNode: ContextShape['replaceNode'];
  toolbar: HTMLDivElement | null;
}

const MarkdownEditorComponent = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  (
    {
      onChange,
      value,
      ariaLabel,
      editorId,
      dataTestSubj,
      height,
      autoFocusDisabled,
      setIsMarkdownInvalid,
    },
    ref
  ) => {
    const [markdownErrorMessages, setMarkdownErrorMessages] = useState([]);
    const onParse = useCallback(
      (err, { messages }) => {
        setMarkdownErrorMessages(err ? [err] : messages);
        setIsMarkdownInvalid(err ? true : false);
      },
      [setIsMarkdownInvalid]
    );
    const editorRef = useRef<EuiMarkdownEditorRef>(null);

    useEffect(() => {
      if (!autoFocusDisabled) {
        editorRef.current?.textarea?.focus();
      }
    }, [autoFocusDisabled]);

    const insightsUpsellingMessage = useUpsellingMessage('investigation_guide');
    const uiPluginsWithState = useMemo(() => {
      return uiPlugins({ insightsUpsellingMessage });
    }, [insightsUpsellingMessage]);

    // @ts-expect-error update types
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
      <EuiMarkdownEditor
        ref={editorRef}
        aria-label={ariaLabel}
        editorId={editorId}
        onChange={onChange}
        value={value}
        uiPlugins={uiPluginsWithState}
        parsingPluginList={parsingPlugins}
        processingPluginList={processingPlugins}
        onParse={onParse}
        errors={markdownErrorMessages}
        data-test-subj={dataTestSubj}
        height={height}
      />
    );
  }
);

MarkdownEditorComponent.displayName = 'MarkdownEditorComponent';

export const MarkdownEditor = memo(MarkdownEditorComponent);
