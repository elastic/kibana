/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  transparentize,
} from '@elastic/eui';
import { css } from '@emotion/css';
import classNames from 'classnames';
import type { Code, InlineCode, Parent, Text } from 'mdast';
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';

import type { Node } from 'unist';
import { customCodeBlockLanguagePlugin } from '../custom_codeblock/custom_codeblock_markdown_plugin';
import { CustomCodeBlock } from '../custom_codeblock/custom_code_block';

interface Props {
  content: string;
  index: number;
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
  background: ${transparentize(euiThemeVars.euiColorDarkShade, 0.25)};
`;

const Cursor = () => (
  <span data-test-subj="cursor" key="cursor" className={classNames(cursorCss, 'cursor')} />
);

// a weird combination of different whitespace chars to make sure it stays
// invisible even when we cannot properly parse the text while still being
// unique
const CURSOR = ` ᠎  `;

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

    const indexOfNode = parent?.children.indexOf(textNode) ?? 0;
    parent?.children.splice(indexOfNode + 1, 0, {
      type: 'cursor' as Text['type'],
      value: CURSOR,
    });
  };

  return (tree: Node) => {
    visitor(tree);
  };
};

const getPluginDependencies = () => {
  const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();

  const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();

  const { components } = processingPlugins[1][1];

  processingPlugins[1][1].components = {
    ...components,
    cursor: Cursor,
    customCodeBlock: (props) => {
      return (
        <>
          <CustomCodeBlock value={props.value} />
          <EuiSpacer size="m" />
        </>
      );
    },
    table: (props) => (
      <>
        <div className="euiBasicTable">
          {' '}
          <table className="euiTable" {...props} />
        </div>
        <EuiSpacer size="m" />
      </>
    ),
    th: (props) => {
      const { children, ...rest } = props;
      return (
        <th className="euiTableHeaderCell" {...rest}>
          <span className="euiTableCellContent">
            <span className="euiTableCellContent__text" title={children}>
              {children}
            </span>
          </span>
        </th>
      );
    },
    tr: (props) => <tr className="euiTableRow" {...props} />,
    td: (props) => {
      const { children, ...rest } = props;
      return (
        <td className="euiTableRowCell" {...rest}>
          <div className="euiTableCellContent euiTableCellContent--truncateText">
            <span className="euiTableCellContent__text" title={children}>
              {children}
            </span>
          </div>
        </td>
      );
    },
  };

  return {
    parsingPluginList: [loadingCursorPlugin, customCodeBlockLanguagePlugin, ...parsingPlugins],
    processingPluginList: processingPlugins,
  };
};

export function MessageText({ loading, content, index }: Props) {
  const containerClassName = css`
    overflow-wrap: break-word;
  `;

  const { parsingPluginList, processingPluginList } = getPluginDependencies();

  return (
    <EuiText className={containerClassName}>
      <EuiMarkdownFormat
        // used by augmentMessageCodeBlocks
        className={`message-${index}`}
        data-test-subj={'messageText'}
        parsingPluginList={parsingPluginList}
        processingPluginList={processingPluginList}
      >
        {`${content}${loading ? CURSOR : ''}`}
      </EuiMarkdownFormat>
    </EuiText>
  );
}
