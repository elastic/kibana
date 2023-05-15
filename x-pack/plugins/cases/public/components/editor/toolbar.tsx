/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { FORMAT_TEXT_COMMAND } from 'lexical';
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
  },
  {
    id: 'mdOl',
    label: 'Ordered list',
    name: 'ol',
    iconType: 'editorOrderedList',
  },
  {
    id: 'mdTl',
    label: 'Task list',
    name: 'tl',
    iconType: 'editorChecklist',
  },
];

const quoteCodeLinkButtons = [
  {
    id: 'mdQuote',
    label: 'Quote',
    name: 'quote',
    iconType: 'quote',
  },
  {
    id: 'mdCode',
    label: 'Code',
    name: 'inlineCode',
    iconType: 'editorCodeBlock',
  },
  {
    id: 'mdLink',
    label: 'Link',
    name: 'link',
    iconType: 'editorLink',
  },
];

const ActionBarComponent: React.FC = () => {
  const [editor] = useLexicalComposerContext();

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
              onClick={() => {}}
              iconType={item.iconType}
              aria-label={item.label}
            />
          </EuiToolTip>
        ))}
        <span className="euiMarkdownEditorToolbar__divider" />
        {quoteCodeLinkButtons.map((item) => (
          <EuiToolTip key={item.id} content={item.label} delay="long">
            <EuiButtonIcon
              color="text"
              onClick={() => {}}
              iconType={item.iconType}
              aria-label={item.label}
            />
          </EuiToolTip>
        ))}
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
