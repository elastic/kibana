/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import type { BaseEditor, Descendant } from 'slate';
import { createEditor } from 'slate';
import type { ReactEditor, RenderElementProps, RenderLeafProps } from 'slate-react';
import { Editable, Slate, withReact } from 'slate-react';

import type {
  CodeElement,
  FormattedText,
  ListElement,
  ListItemElement,
  ParagraphElement,
  TitleElement,
} from './formatted_text';
import {
  ParagraphStyleSelect,
  ToggleBlockButton,
  ToggleFormatButton,
  withFormattedText,
} from './formatted_text';
import { Mention, withMentions } from './mentions';
import type { MentionElement } from './mentions';

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element:
      | TitleElement
      | ParagraphElement
      | CodeElement
      | MentionElement
      | ListElement
      | ListItemElement;
    Text: FormattedText;
  }
}

export const RichTextEditor: FunctionComponent = () => {
  const editor = useMemo(() => {
    return withFormattedText(withMentions(withReact(createEditor())));
  }, []);
  const [value, setValue] = useState<Descendant[]>([
    {
      type: 'title',
      size: 's',
      children: [{ text: 'Heading' }],
    },
    {
      type: 'paragraph',
      children: [
        { text: 'This is editable ' },
        { text: 'rich', bold: true },
        { text: ' text, ' },
        { text: 'much', italic: true },
        { text: ' better than a ' },
        { text: '<textarea>', code: true },
        { text: '!' },
      ],
    },
    {
      type: 'paragraph',
      children: [
        {
          type: 'mention',
          username: 'larry',
          children: [{ text: '@Larry' }],
        },
        { text: ' What do you think?' },
      ],
    },
    {
      type: 'list',
      listType: 'bullet',
      children: [
        {
          type: 'listItem',
          children: [{ text: 'list' }],
        },
        {
          type: 'listItem',
          children: [{ text: 'items' }],
        },
      ],
    },
    {
      type: 'code',
      language: 'html',
      children: [{ text: '<a href="https://elastic.co">Elastic</a>' }],
    },
  ]);

  return (
    <Slate editor={editor} value={value} onChange={(nextValue) => setValue(nextValue)}>
      <EuiSplitPanel.Outer hasBorder>
        <EuiSplitPanel.Inner
          color="subdued"
          paddingSize="s"
          className="euiMarkdownEditorToolbar__buttons"
        >
          <ParagraphStyleSelect />
          <span className="euiMarkdownEditorToolbar__divider" />
          <ToggleFormatButton format="bold" iconType="editorBold" aria-label="Bold" />
          <ToggleFormatButton format="italic" iconType="editorItalic" aria-label="Italic" />
          <ToggleFormatButton
            format="underline"
            iconType="editorUnderline"
            aria-label="Underline"
          />
          <span className="euiMarkdownEditorToolbar__divider" />
          <ToggleBlockButton type="list" iconType="editorUnorderedList" aria-label="List" />
          <ToggleBlockButton type="list" iconType="editorOrderedList" aria-label="List" />
          <span className="euiMarkdownEditorToolbar__divider" />
          <EuiButtonIcon iconType="editorLink" color="text" aria-label="Link" />
          <EuiButtonIcon iconType="user" color="text" aria-label="Mention" />
          <EuiButtonIcon iconType="quote" color="text" aria-label="Quote" />
          <ToggleBlockButton type="code" iconType="editorCodeBlock" aria-label="Code snippet" />
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <EuiText size="s">
            <Editable renderElement={renderElement} renderLeaf={renderLeaf} />
          </EuiText>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </Slate>
  );
};

export const renderLeaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  if (leaf.bold) {
    children = <strong {...attributes}>{children}</strong>;
  }

  if (leaf.italic) {
    children = <em {...attributes}>{children}</em>;
  }

  if (leaf.underline) {
    children = <u {...attributes}>{children}</u>;
  }

  if (leaf.code) {
    children = <EuiCode {...attributes}>{children}</EuiCode>;
  }

  return <span {...attributes}>{children}</span>;
};

export const renderElement = ({ attributes, children, element }: RenderElementProps) => {
  switch (element.type) {
    case 'mention':
      return (
        <Mention element={element} attributes={attributes}>
          {children}
        </Mention>
      );

    case 'title':
      return (
        <EuiTitle size={element.size}>
          <div {...attributes}>{children}</div>
        </EuiTitle>
      );

    case 'code':
      return (
        <EuiCodeBlock language={element.language} paddingSize="m" lineNumbers {...attributes}>
          {children}
        </EuiCodeBlock>
      );

    case 'list':
      return <ul {...attributes}>{children}</ul>;

    case 'listItem':
      return <li {...attributes}>{children}</li>;

    default:
      return <p {...attributes}>{children}</p>;
  }
};
