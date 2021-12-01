/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiContextMenuItem, EuiHighlight, EuiLink, EuiPopover } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import type { BaseElement, BaseText } from 'slate';
import { Editor, Element as SlateElement, Node as SlateNode, Transforms } from 'slate';
import type { RenderElementProps } from 'slate-react';
import { ReactEditor, useFocused, useSelected, useSlate } from 'slate-react';

import { getPath, isBlockActive } from './utils';

export interface MentionElement extends BaseElement {
  type: 'mention';
  username?: string;
  children: BaseText[];
}

export interface MentionProps extends RenderElementProps {
  element: MentionElement;
}

export const Mention: FunctionComponent<MentionProps> = ({ element, children, attributes }) => {
  const editor = useSlate();
  const selected = useSelected();
  const focused = useFocused();
  const text = SlateNode.string(element).replace('@', '');
  const users = ['Thom', 'Larry', 'Joe', 'Oleg', 'Thomas', 'Xavier'].filter((username) =>
    username.toLowerCase().includes(text.toLowerCase())
  );

  return (
    <span
      contentEditable={!element.username}
      style={{
        // display: 'inline-block',
        boxShadow: element.username && selected && focused ? '0 0 0 2px #B4D5FF' : 'none',
      }}
    >
      {element.username ? (
        <EuiLink href={`#${element.username}`} {...attributes}>
          {`@${text}`}
          {children}
        </EuiLink>
      ) : (
        <EuiPopover
          button={children}
          isOpen={selected}
          initialFocus={false}
          ownFocus={false}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          hasArrow={false}
          style={{ verticalAlign: 'baseline' }}
          {...attributes}
        >
          {users.map((username) => (
            <EuiContextMenuItem
              key={username}
              icon={<EuiAvatar size="s" name={username} />}
              size="s"
              onClick={(event) => {
                event.preventDefault();
                const path = getPath(editor, element);
                Transforms.setNodes(editor, { username }, { at: path });
                Transforms.insertText(editor, `@${username}`, { at: path, voids: true });
                setTimeout(() => {
                  Transforms.move(editor);
                  ReactEditor.focus(editor);
                });
              }}
            >
              <EuiHighlight search={text} highlightAll>
                {username}
              </EuiHighlight>
            </EuiContextMenuItem>
          ))}
        </EuiPopover>
      )}
    </span>
  );
};

export const withMentions = (editor: Editor) => {
  const { isInline, isVoid, insertText, normalizeNode } = editor;

  editor.isInline = (element) => {
    return element.type === 'mention' ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === 'mention' && element.username ? true : isVoid(element);
  };

  editor.insertText = (text) => {
    if (editor.selection) {
      if (text === '@') {
        Transforms.insertNodes(editor, {
          type: 'mention',
          username: undefined,
          children: [{ text }],
        });
        return;
      } else if (text === ' ') {
        if (isBlockActive(editor, 'mention')) {
          Transforms.unwrapNodes(editor, {
            match: (node) =>
              !Editor.isEditor(node) &&
              SlateElement.isElement(node) &&
              node.type === 'mention' &&
              !node.username,
          });
          Transforms.insertText(editor, text);
          return;
        }
      }
    }

    insertText(text);
  };

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    if (SlateElement.isElement(node) && node.type === 'code') {
      for (const [child, childPath] of SlateNode.children(editor, path)) {
        if (SlateElement.isElement(child)) {
          Transforms.unwrapNodes(editor, { at: childPath });
          return;
        }
        const marks = Object.keys(child).filter((mark) => mark !== 'text');
        if (marks.length > 0) {
          Transforms.unsetNodes(editor, marks, {
            at: childPath,
          });
          return;
        }
      }
    }

    normalizeNode(entry);
  };

  return editor;
};
