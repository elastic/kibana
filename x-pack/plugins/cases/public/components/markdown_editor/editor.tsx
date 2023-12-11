/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElementRef } from 'react';
import React, {
  memo,
  forwardRef,
  useCallback,
  useRef,
  useState,
  useImperativeHandle,
  useMemo,
} from 'react';
import type { EuiMarkdownEditorProps, EuiMarkdownAstNode } from '@elastic/eui';
import { EuiMarkdownEditor } from '@elastic/eui';
import type { ContextShape } from '@elastic/eui/src/components/markdown_editor/markdown_context';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import type { Owner } from '../../../common/constants/types';
import { usePlugins } from './use_plugins';
import { useLensButtonToggle } from './plugins/lens/use_lens_button_toggle';
import { createFileHandler } from './file_handler';
import { useCasesContext } from '../cases_context/use_cases_context';

interface MarkdownEditorProps {
  ariaLabel: string;
  dataTestSubj?: string;
  editorId: string;
  height?: number;
  onChange: (content: string) => void;
  disabledUiPlugins?: string[] | undefined;
  value: string;
}

export type EuiMarkdownEditorRef = ElementRef<typeof EuiMarkdownEditor>;

export interface MarkdownEditorRef {
  textarea: HTMLTextAreaElement | null;
  replaceNode: ContextShape['replaceNode'];
  toolbar: HTMLDivElement | null;
}

const MarkdownEditorComponent = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ ariaLabel, dataTestSubj, editorId, height, onChange, value, disabledUiPlugins }, ref) => {
    const { client: filesClient } = useFilesContext();
    const { owner } = useCasesContext();
    const astRef = useRef<EuiMarkdownAstNode | undefined>(undefined);
    const [markdownErrorMessages, setMarkdownErrorMessages] = useState([]);
    const onParse: EuiMarkdownEditorProps['onParse'] = useCallback((err, { messages, ast }) => {
      setMarkdownErrorMessages(err ? [err] : messages);
      astRef.current = ast;
    }, []);

    const { parsingPlugins, processingPlugins, uiPlugins } = usePlugins(disabledUiPlugins);
    const editorRef = useRef<EuiMarkdownEditorRef>(null);

    const fileOwner = owner[0];
    const domain = `${window.location.protocol}//${window.location.host}`;

    const dropHandlers = useMemo(() => {
      return [
        createFileHandler({
          filesClient,
          owner: fileOwner as Owner,
          domain,
        }),
      ];
    }, [fileOwner, filesClient, domain]);

    useLensButtonToggle({
      astRef,
      uiPlugins,
      editorRef: ref as React.MutableRefObject<MarkdownEditorRef>,
      value,
    });

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
        dropHandlers={dropHandlers}
      />
    );
  }
);

MarkdownEditorComponent.displayName = 'MarkdownEditor';

export const MarkdownEditor = memo(MarkdownEditorComponent);
