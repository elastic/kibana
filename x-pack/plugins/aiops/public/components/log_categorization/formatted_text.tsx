/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { EuiText, EuiHorizontalRule, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Category } from '../../../common/api/log_categorization/types';

interface Props {
  category: Category;
  count?: number;
}

const tokenStyle = css`
  font-weight: bold;
  color: #765b96;
`;
const wildcardStyle = css`
  font-weight: bold;
  color: #357160;
`;

function createFormattedExample(key: string, example: string): JSX.Element[] {
  const keyTokens = key.split(' ');
  let tempExample = ` ${example} `;
  const positions = keyTokens.map((t) => ({
    id: t,
    start: 0,
    end: 0,
  }));
  const elements: JSX.Element[] = [];
  let offset = 0;
  for (let i = 0; i < keyTokens.length; i++) {
    const token = keyTokens[i];
    const tokenReg = new RegExp(`(\\W)(${token})(\\W)`);

    let j = 0;
    const result = tokenReg.exec(tempExample);
    if (!result) {
      continue;
    }
    j = result.index;
    positions[i].start = offset + j + 1;
    positions[i].end = offset + j + token.length + 1;
    tempExample = tempExample.slice(j + token.length + 1);
    offset += j + token.length + 1;
  }

  tempExample = ` ${example} `;

  elements.push(<span css={wildcardStyle}>{tempExample.substring(0, positions[0].start)}</span>);
  for (let i = 0; i < positions.length; i++) {
    elements.push(
      <span css={tokenStyle}>{tempExample.substring(positions[i].start, positions[i].end)}</span>
    );
    if (positions[i + 1]) {
      elements.push(
        <span css={wildcardStyle}>
          {tempExample.substring(positions[i].end, positions[i + 1].start)}
        </span>
      );
    }
  }

  elements.push(
    <span css={wildcardStyle}>{tempExample.substring(positions[positions.length - 1].end)}</span>
  );

  return elements;
}

export const FormattedPatternExamples: FC<Props> = ({ category, count }) => {
  const e = useMemo(() => {
    const { key, examples } = category;
    const tempCount =
      count === undefined || (count !== undefined && count > examples.length)
        ? examples.length
        : count;
    const formattedExamples = new Array(tempCount)
      .fill(0)
      .map((_, i) => createFormattedExample(key, examples[i]));
    return (
      <EuiFlexGroup direction="column" gutterSize="none">
        {formattedExamples.map((example, i) => (
          <EuiFlexItem grow={false}>
            <code>{example}</code>
            {i < formattedExamples.length - 1 ? <EuiHorizontalRule margin="s" /> : null}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }, [category, count]);

  return <EuiText size="s">{e}</EuiText>;
};

export const FormattedRegex: FC<Props> = ({ category }) => {
  const { regex } = category;
  const formattedRegex = useMemo(() => {
    const regexTokens = regex.split(/(\.\*\?)|(\.\+\?)/).filter((d) => d !== undefined);
    const elements: JSX.Element[] = [];
    for (let i = 0; i < regexTokens.length; i++) {
      const token = regexTokens[i];
      if (token.match(/\.\*\?|\.\+\?/)) {
        elements.push(<span css={wildcardStyle}>{token}</span>);
      } else {
        elements.push(<span css={tokenStyle}>{token}</span>);
      }
    }
    return elements;
  }, [regex]);
  return (
    <EuiText size="s">
      <code>{formattedRegex}</code>
    </EuiText>
  );
};

export const FormattedTokens: FC<Props> = ({ category }) => (
  <EuiText size="s">
    <code css={tokenStyle}>{category.key}</code>
  </EuiText>
);
