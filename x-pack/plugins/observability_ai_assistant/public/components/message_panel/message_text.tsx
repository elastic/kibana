/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 } from 'uuid';
import React from 'react';
import type { Node } from 'unist';
import { css } from '@emotion/css';
import type { Parent, Text } from 'mdast';
import ReactMarkdown from 'react-markdown';
import { EuiText } from '@elastic/eui';

interface Props {
  content: string;
  loading: boolean;
}

const cursorCss = css`
  @keyframes blink {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  animation: blink 1s infinite;
  width: 10px;
  height: 16px;
  vertical-align: middle;
  display: inline-block;
  background: rgba(0, 0, 0, 0.25);
`;

const cursor = <span className={cursorCss} />;

const CURSOR = `{{${v4()}}`;

const loadingCursorPlugin = () => {
  const visitor = (node: Node, parent?: Parent) => {
    if ('children' in node) {
      const nodeAsParent = node as Parent;
      nodeAsParent.children.forEach((child) => {
        visitor(child, nodeAsParent);
      });
    }

    if (node.type !== 'text') {
      return;
    }

    const textNode = node as Text;

    const indexOfCursor = textNode.value.indexOf(CURSOR);
    if (indexOfCursor === -1) {
      return;
    }

    textNode.value = textNode.value.replace(CURSOR, '');

    const indexOfNode = parent!.children.indexOf(textNode);
    parent!.children.splice(indexOfNode + 1, 0, {
      type: 'cursor' as Text['type'],
      value: CURSOR,
      data: {
        hName: 'cursor',
      },
    });
  };

  return (tree: Node) => {
    visitor(tree);
  };
};

export function MessageText(props: Props) {
  return (
    <EuiText size="s">
      <ReactMarkdown
        plugins={[loadingCursorPlugin]}
        components={
          {
            cursor: () => cursor,
          } as Record<string, any>
        }
      >
        {`${props.content}${props.loading ? CURSOR : ''}`}
      </ReactMarkdown>
    </EuiText>
  );
}
