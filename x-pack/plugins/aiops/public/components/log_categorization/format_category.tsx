/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiText, EuiHorizontalRule } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import { useIsDarkTheme } from '../../hooks/use_eui_theme';

interface Props {
  category: Category;
  count?: number;
}

// copies of the syntax colors used in EuiCode
const tokenStyleLight = css`
  color: #765b96;
`;
const wildcardStyleLight = css`
  color: #357160;
`;
const tokenStyleDark = css`
  color: #a68ac5;
`;
const wildcardStyleDark = css`
  color: #54b399;
`;

interface Styles {
  tokenStyle: SerializedStyles;
  wildcardStyle: SerializedStyles;
}

const useStyles = (): Styles => {
  const isDarkTheme = useIsDarkTheme();

  return useMemo(
    () =>
      isDarkTheme
        ? {
            tokenStyle: tokenStyleDark,
            wildcardStyle: wildcardStyleDark,
          }
        : {
            tokenStyle: tokenStyleLight,
            wildcardStyle: wildcardStyleLight,
          },
    [isDarkTheme]
  );
};

export const useCreateFormattedExample = () => {
  const { tokenStyle, wildcardStyle } = useStyles();

  const createFormattedExample = useCallback(
    (key: string, example: string): JSX.Element[] => {
      const keyTokens = key.split(' ');
      let tempExample = ` ${example} `;
      const positions = keyTokens.map((t) => ({
        id: t,
        start: 0,
        end: 0,
      }));
      let offset = 0;
      // match each token in order and record the start and end position
      for (let i = 0; i < keyTokens.length; i++) {
        const token = keyTokens[i];
        const tokenReg = new RegExp(`(\\W)(${token})(\\W)`);

        let j = 0;
        const result = tokenReg.exec(tempExample);
        if (!result) {
          continue;
        }
        j = result.index;
        const localEndOFToken = j + token.length + 1;
        positions[i].start = offset + j + 1;
        positions[i].end = offset + localEndOFToken;
        // slice the example string to remove the token and preceding text
        // to ensure we don't match future tokens in earlier text
        tempExample = tempExample.slice(localEndOFToken);
        offset += localEndOFToken;
      }

      tempExample = ` ${example} `;

      // build up the list ot elements by chopping up the example string
      // using the token positions found above
      const elements: JSX.Element[] = [];
      let pos = 0;
      for (let i = 0; i < positions.length; i++) {
        elements.push(
          <span css={wildcardStyle}>{tempExample.substring(pos, positions[i].start)}</span>
        );

        elements.push(
          <span css={tokenStyle}>
            {tempExample.substring(positions[i].start, positions[i].end)}
          </span>
        );
        pos = positions[i].end;
      }

      elements.push(
        <span css={wildcardStyle}>
          {tempExample.substring(positions[positions.length - 1].end)}
        </span>
      );

      return elements;
    },
    [tokenStyle, wildcardStyle]
  );

  return createFormattedExample;
};

export const FormattedPatternExamples: FC<Props> = ({ category, count }) => {
  const createFormattedExample = useCreateFormattedExample();

  const e = useMemo(() => {
    const { key, examples } = category;
    const tempCount = count === undefined || count > examples.length ? examples.length : count;
    const formattedExamples = new Array(tempCount)
      .fill(0)
      .map((_, i) => createFormattedExample(key, examples[i]));
    return formattedExamples.map((example, i) => (
      <>
        <code>{example}</code>
        {i < formattedExamples.length - 1 ? <EuiHorizontalRule margin="s" /> : null}
      </>
    ));
  }, [category, count, createFormattedExample]);

  return <WrapInText>{e}</WrapInText>;
};

export const FormattedRegex: FC<Props> = ({ category }) => {
  const { tokenStyle, wildcardStyle } = useStyles();

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
  }, [regex, tokenStyle, wildcardStyle]);
  return (
    <WrapInText>
      <code>{formattedRegex}</code>
    </WrapInText>
  );
};

export const FormattedTokens: FC<Props> = ({ category }) => {
  const { tokenStyle } = useStyles();

  return (
    <WrapInText>
      <code css={tokenStyle}>{category.key}</code>
    </WrapInText>
  );
};

const WrapInText: FC = ({ children }) => (
  <EuiText css={{ fontWeight: 'bold' }} size="s">
    {children}
  </EuiText>
);
