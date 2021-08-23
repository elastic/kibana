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
  useEffect,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
  ElementRef,
} from 'react';
import { some } from 'lodash';
import { PluggableList } from 'unified';
import { EuiMarkdownAstNode, EuiMarkdownEditor, EuiMarkdownEditorUiPlugin } from '@elastic/eui';
import { ContextShape } from '@elastic/eui/src/components/markdown_editor/markdown_context';
import useDebounce from 'react-use/lib/useDebounce';
import { usePlugins } from './use_plugins';
import { CommentEditorContext } from './context';
import { PREFIX } from './plugins/lens/constants';
import { useLensButtonToggle } from './plugins/lens/use_lens_button_toggle';

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
    const astRef = useRef(null);
    const [markdownErrorMessages, setMarkdownErrorMessages] = useState([]);
    const onParse = useCallback((err, { messages, ast }) => {
      setMarkdownErrorMessages(err ? [err] : messages);
      astRef.current = ast;
    }, []);
    const { parsingPlugins, processingPlugins, uiPlugins } = usePlugins();
    const editorRef = useRef<EuiMarkdownEditorRef>(null);
    const { enableLensButton, disableLensButton } = useLensButtonToggle();
    const [lensNodeSelected, setLensNodeSelected] = useState(false);
    const lensPluginAvailable = useRef(false);

    const commentEditorContextValue = useMemo(
      () => ({
        editorId,
        value,
      }),
      [editorId, value]
    );

    useEffect(() => {
      lensPluginAvailable.current = some(uiPlugins, ['name', 'lens']);
    }, [uiPlugins]);

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

    useDebounce(
      () => {
        if (lensNodeSelected || !value.includes(PREFIX)) {
          // @ts-expect-error
          enableLensButton({ editorRef: ref?.current! });
        } else {
          // @ts-expect-error
          disableLensButton({ editorRef: ref?.current! });
        }
      },
      100,
      [value, lensNodeSelected]
    );

    // Copied from https://github.com/elastic/eui/blob/master/src/components/markdown_editor/markdown_editor.tsx#L279
    useEffect(() => {
      if (
        editorRef.current?.textarea == null ||
        astRef.current == null ||
        !lensPluginAvailable.current
      ) {
        return;
      }

      const getCursorNode = () => {
        const { selectionStart } = editorRef.current?.textarea!;

        let node: EuiMarkdownAstNode = astRef.current!;

        outer: while (true) {
          if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
              const child = node.children[i];
              if (
                child.position.start.offset < selectionStart &&
                selectionStart < child.position.end.offset
              ) {
                if (child.type === 'text') break outer; // don't dive into `text` nodes
                node = child;
                continue outer;
              }
            }
          }
          break;
        }

        setLensNodeSelected(node.type === 'lens');
      };

      const textarea = editorRef.current?.textarea;

      textarea.addEventListener('keyup', getCursorNode);
      textarea.addEventListener('mouseup', getCursorNode);

      return () => {
        textarea.removeEventListener('keyup', getCursorNode);
        textarea.removeEventListener('mouseup', getCursorNode);
      };
    }, [editorRef.current?.textarea]);

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
