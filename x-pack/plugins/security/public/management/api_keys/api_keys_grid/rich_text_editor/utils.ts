/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, Text } from 'slate';
import { Editor, Element, Transforms } from 'slate';

export const getPath = (editor: Editor, element: Node) => {
  const [match] = Editor.nodes(editor, {
    match: (node) => node === element,
  });
  const [, path] = match;
  return path;
};

export type TextFormat = keyof Omit<Text, 'text'>;

export const isFormatActive = (editor: Editor, format: TextFormat) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

export const toggleFormat = (editor: Editor, format: TextFormat) => {
  if (isFormatActive(editor, format)) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

export const isBlockActive = (editor: Editor, type: Element['type'], key?: string, value?: any) => {
  if (!editor.selection) {
    return false;
  }

  const [match] = Editor.nodes(editor, {
    at: Editor.unhangRange(editor, editor.selection),
    match: (node) =>
      !Editor.isEditor(node) &&
      Element.isElement(node) &&
      node.type === type &&
      (!key || node[key] === value),
  });

  return !!match;
};

export const toggleBlock = (editor: Editor, type: Element['type'], key?: string, value?: any) => {
  const isActive = isBlockActive(editor, type, key, value);

  Transforms.unwrapNodes(editor, {
    match: (node) => !Editor.isEditor(node) && Element.isElement(node) && node.type === 'list',
    split: true,
  });

  Transforms.setNodes<Element>(editor, {
    type: isActive ? 'paragraph' : type === 'list' ? 'listItem' : type,
    [key!]: value,
  });

  if (!isActive && type === 'list') {
    Transforms.wrapNodes(editor, { type, listType: 'bullet', children: [] });
  }
};
