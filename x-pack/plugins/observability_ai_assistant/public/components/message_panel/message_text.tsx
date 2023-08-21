/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';
import classNames from 'classnames';
import type { Code, InlineCode, Parent, Text } from 'mdast';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Node } from 'unist';
import { v4 } from 'uuid';

interface Props {
  content: string;
  loading: boolean;
}

const ANIMATION_TIME = 1;

const cursorCss = css`
  @keyframes blink {
    0% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  animation: blink ${ANIMATION_TIME}s infinite;
  width: 10px;
  height: 16px;
  vertical-align: middle;
  display: inline-block;
  background: rgba(0, 0, 0, 0.25);
`;

const Cursor = () => <span key="cursor" className={classNames(cursorCss, 'cursor')} />;

const CURSOR = `{{${v4()}}`;

const loadingCursorPlugin = () => {
  const visitor = (node: Node, parent?: Parent) => {
    if ('children' in node) {
      const nodeAsParent = node as Parent;
      nodeAsParent.children.forEach((child) => {
        visitor(child, nodeAsParent);
      });
    }

    if (node.type !== 'text' && node.type !== 'inlineCode' && node.type !== 'code') {
      return;
    }

    const textNode = node as Text | InlineCode | Code;

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
  const containerClassName = css`
    overflow-wrap: break-word;

    pre {
      background: ${euiThemeVars.euiColorLightestShade};
      padding: 0 8px;
    }
  `;

  return (
    <EuiText size="s" className={containerClassName}>
      <ReactMarkdown
        plugins={[loadingCursorPlugin]}
        components={
          {
            cursor: Cursor,
          } as Record<string, any>
        }
      >
        {`${props.content}${props.loading ? CURSOR : ''}`}
      </ReactMarkdown>
    </EuiText>
  );
}
