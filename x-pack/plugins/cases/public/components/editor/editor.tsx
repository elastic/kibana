/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EditorState } from 'lexical';
import { TRANSFORMERS } from '@lexical/markdown';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';

import React from 'react';
import { editorConfig } from './config';
import { ActionBar } from './toolbar';
import { Footer } from './footer';
import { LensPlugin } from './lens/plugin';

const onChange = (editorState: EditorState) => {};

const EditorComponent: React.FC = () => {
  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="euiMarkdownEditor">
        <ActionBar />
        <div className="euiMarkdownEditor__toggleContainer">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="euiMarkdownEditorTextArea"
                style={{ maxHeight: '458px', minHeight: '208px' }}
              />
            }
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin onChange={onChange} />
          <HistoryPlugin />
          <LensPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <Footer />
        </div>
      </div>
    </LexicalComposer>
  );
};

EditorComponent.displayName = 'CaseEditor';

export const Editor = React.memo(EditorComponent);
