/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { LexicalEditor } from 'lexical';
import { $getSelection, FORMAT_TEXT_COMMAND, $isRangeSelection } from 'lexical';
import { $createQuoteNode } from '@lexical/rich-text';
import { $wrapNodes } from '@lexical/selection';
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { INSERT_LENS_COMMAND } from './lens/plugin';

const boldItalicButtons = [
  {
    id: 'bold' as const,
    label: 'Bold',
    name: 'strong',
    iconType: 'editorBold',
  },
  {
    id: 'italic' as const,
    label: 'Italic',
    name: 'emphasis',
    iconType: 'editorItalic',
  },
];

const listButtons = [
  {
    id: 'mdUl',
    label: 'Unordered list',
    name: 'ul',
    iconType: 'editorUnorderedList',
    getOnClick: (editor: LexicalEditor) => () => {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    id: 'mdOl',
    label: 'Ordered list',
    name: 'ol',
    iconType: 'editorOrderedList',
    getOnClick: (editor: LexicalEditor) => () => {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    id: 'mdTl',
    label: 'Task list',
    name: 'tl',
    iconType: 'editorChecklist',
    getOnClick: (editor: LexicalEditor) => () => {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    },
  },
];

const ActionBarComponent: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () => $createQuoteNode());
      }
    });
  };

  const insertLink = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
  };

  return (
    <div className="euiMarkdownEditorToolbar" style={{ width: '100%', minHeight: '42px' }}>
      <div className="euiMarkdownEditorToolbar__buttons">
        {boldItalicButtons.map((item) => (
          <EuiToolTip key={item.id} content={item.label} delay="long">
            <EuiButtonIcon
              color="text"
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, item.id);
              }}
              iconType={item.iconType}
              aria-label={item.label}
            />
          </EuiToolTip>
        ))}
        <span className="euiMarkdownEditorToolbar__divider" />
        {listButtons.map((item) => (
          <EuiToolTip key={item.id} content={item.label} delay="long">
            <EuiButtonIcon
              color="text"
              onClick={item.getOnClick(editor)}
              iconType={item.iconType}
              aria-label={item.label}
            />
          </EuiToolTip>
        ))}
        <span className="euiMarkdownEditorToolbar__divider" />
        <EuiToolTip key="quote" content="Quote" delay="long">
          <EuiButtonIcon color="text" onClick={formatQuote} iconType="quote" aria-label="quote" />
        </EuiToolTip>
        <EuiToolTip key="code" content="Code" delay="long">
          <EuiButtonIcon
            color="text"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
            iconType="editorCodeBlock"
            aria-label="code"
          />
        </EuiToolTip>
        <EuiToolTip key="code" content="Code" delay="long">
          <EuiButtonIcon
            color="text"
            onClick={insertLink}
            iconType="link"
            aria-label="link"
            size="xs"
          />
        </EuiToolTip>
        <span className="euiMarkdownEditorToolbar__divider" />
        <EuiButtonIcon
          color="text"
          onClick={() => {
            editor.dispatchCommand(INSERT_LENS_COMMAND, '');
          }}
          iconType="lensApp"
          aria-label="lens"
        />
      </div>
    </div>
  );
};

ActionBarComponent.displayName = 'ActionBar';

export const ActionBar = React.memo(ActionBarComponent);
