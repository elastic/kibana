/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTitleProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import { Editor, Element, Node, Text, Transforms } from 'slate';
import type { BaseElement, BaseText, Descendant } from 'slate';
import { ReactEditor, useSlate } from 'slate-react';

import { isBlockActive, isFormatActive, toggleBlock, toggleFormat } from './utils';

export interface FormattedText extends BaseText {
  bold?: true;
  italic?: true;
  underline?: true;
  code?: true;
}

export interface TitleElement extends BaseElement {
  type: 'title';
  size: EuiTitleProps['size'];
}

export interface ParagraphElement extends BaseElement {
  type: 'paragraph';
}

export interface CodeElement extends BaseElement {
  type: 'code';
  language?: string;
  children: BaseText[];
}

export interface ListElement extends BaseElement {
  type: 'list';
  listType: string;
  children: ListItemElement[];
}

export interface ListItemElement extends BaseElement {
  type: 'listItem';
  children: Descendant[];
}

export const ParagraphStyleSelect: FunctionComponent = () => {
  const editor = useSlate();
  const [isOpen, setIsOpen] = useState(false);

  const isParagraphActive = isBlockActive(editor, 'paragraph');
  const isTitle1Active = isBlockActive(editor, 'title', 'size', 'm');
  const isTitle2Active = isBlockActive(editor, 'title', 'size', 's');
  const isTitle3Active = isBlockActive(editor, 'title', 'size', 'xs');
  const isTitle4Active = isBlockActive(editor, 'title', 'size', 'xxs');

  const button = (
    <EuiButtonEmpty
      size="s"
      color="text"
      iconType="arrowDown"
      iconSide="right"
      onMouseDown={(event) => {
        event.preventDefault();
        setIsOpen(!isOpen);
      }}
      isDisabled={!isParagraphActive && !isBlockActive(editor, 'title')}
    >
      {isTitle1Active
        ? 'Heading 1'
        : isTitle2Active
        ? 'Heading 2'
        : isTitle3Active
        ? 'Heading 3'
        : isTitle4Active
        ? 'Heading 4'
        : 'Normal text'}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={button}
      isOpen={isOpen}
      closePopover={() => {
        setIsOpen(false);
        ReactEditor.focus(editor);
      }}
    >
      <EuiContextMenuPanel
        initialFocusedItemIndex={
          isTitle1Active ? 1 : isTitle2Active ? 2 : isTitle3Active ? 3 : isTitle4Active ? 4 : 0
        }
        items={[
          <EuiContextMenuItem
            key="paragraph"
            onClick={() => {
              toggleBlock(editor, 'paragraph');
              setIsOpen(false);
              setTimeout(() => ReactEditor.focus(editor));
            }}
          >
            <p>Normal text</p>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="title1"
            onClick={() => {
              toggleBlock(editor, 'title', 'size', 'm');
              setIsOpen(false);
              setTimeout(() => ReactEditor.focus(editor));
            }}
          >
            <EuiTitle size="m">
              <div>Heading 1</div>
            </EuiTitle>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="title2"
            onClick={() => {
              toggleBlock(editor, 'title', 'size', 's');
              setIsOpen(false);
              setTimeout(() => ReactEditor.focus(editor));
            }}
          >
            <EuiTitle size="s">
              <div>Heading 2</div>
            </EuiTitle>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="title3"
            onClick={() => {
              toggleBlock(editor, 'title', 'size', 'xs');
              setIsOpen(false);
              setTimeout(() => ReactEditor.focus(editor));
            }}
          >
            <EuiTitle size="xs">
              <div>Heading 3</div>
            </EuiTitle>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="title4"
            onClick={() => {
              toggleBlock(editor, 'title', 'size', 'xxs');
              setIsOpen(false);
              setTimeout(() => ReactEditor.focus(editor));
            }}
          >
            <EuiTitle size="xxs">
              <div>Heading 4</div>
            </EuiTitle>
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

export interface ToggleFormatButtonProps {
  iconType: string;
  format: keyof Omit<FormattedText, 'text'>;
}

export const ToggleFormatButton: FunctionComponent<ToggleFormatButtonProps> = ({
  format,
  iconType,
}) => {
  const editor = useSlate();
  const isSelected = isFormatActive(editor, format);
  return (
    <EuiButtonIcon
      iconType={iconType}
      color="text"
      display={isSelected ? 'base' : 'empty'}
      aria-label="Bold"
      isSelected={isSelected}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleFormat(editor, format);
      }}
    />
  );
};

export interface ToggleBlockButtonProps {
  iconType: string;
  type: Element['type'];
}

export const ToggleBlockButton: FunctionComponent<ToggleBlockButtonProps> = ({
  type,
  iconType,
}) => {
  const editor = useSlate();
  const isSelected = isBlockActive(editor, type);
  return (
    <EuiButtonIcon
      iconType={iconType}
      color="text"
      display={isSelected ? 'base' : 'empty'}
      aria-label="Bold"
      isSelected={isSelected}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, type);
        ReactEditor.focus(editor);
      }}
    />
  );
};

export const withFormattedText = (editor: Editor) => {
  const { insertText, insertBreak, normalizeNode } = editor;

  editor.insertBreak = () => {
    const block = Editor.above<Element>(editor, {
      match: (node) => Editor.isBlock(editor, node),
    });
    if (block) {
      const [element] = block;
      switch (element.type) {
        case 'title':
          Transforms.insertNodes(editor, {
            type: 'paragraph',
            children: [{ text: '' }],
          });
          return;

        case 'mention':
          return;

        case 'listItem':
          if (Node.string(element).trim() === '') {
            Transforms.liftNodes(editor);
            Transforms.setNodes(editor, { type: 'paragraph' });
            return;
          }
          break;

        case 'code':
          if (Node.string(element).endsWith('\n')) {
            Transforms.insertNodes(editor, {
              type: 'paragraph',
              children: [{ text: '' }],
            });
            return;
          }
          Transforms.insertText(editor, '\n');
          return;
      }
    }

    insertBreak();
  };

  editor.insertText = (text) => {
    const { selection } = editor;

    if (selection) {
      const { anchor } = selection;
      const block = Editor.above(editor, {
        match: (node) => Editor.isBlock(editor, node),
      });
      const path = block ? block[1] : [];
      const range = { anchor, focus: Editor.start(editor, path) };
      const beforeText = Editor.string(editor, range);
      const line = `${beforeText}${text}`;

      if (line === '```') {
        Transforms.select(editor, range);
        Transforms.delete(editor);
        const newProperties: Partial<Element> = {
          type: 'code',
        };
        Transforms.setNodes<Element>(editor, newProperties, {
          match: (n) => Editor.isBlock(editor, n),
        });
        return;
      }
    }

    insertText(text);
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    if (Element.isElement(node) && node.type === 'paragraph') {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (Element.isElement(child) && !editor.isInline(child)) {
          Transforms.unwrapNodes(editor, { at: childPath });
          return;
        }
      }
    }

    if (Element.isElement(node) && node.type === 'code') {
      for (const [child, childPath] of Node.children(editor, path)) {
        if (!Text.isText(child)) {
          Transforms.unwrapNodes(editor, { at: childPath });
          return;
        }
      }
    }

    normalizeNode(entry);
  };

  return editor;
};
