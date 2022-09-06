/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CSSObject } from '@emotion/react';

type Props = {
  children: JSX.Element | JSX.Element[];
  text: string;
  match: null | number[];
  highlightStyle: any;
};

const css: CSSObject = {
  '&&': {
    display: 'inline',
    fontSize: 0,
    lineHeight: 0,
    verticalAlign: 'middle',
  },
};
// Component that takes an array of matching indices in a text and pass down a highlight
// css style prop across its children
// Currently it works only for a single child level, designed to be in combination with SplitText
// It adds a `aria-label` attribute to a parent span, which is used by screen readers to
// read the text as a single block.
export const TextHighlight = ({ children, match, text, highlightStyle }: Props): JSX.Element => {
  let startIdx = 0;

  return (
    <span css={css} aria-label={text} role="document">
      {!match
        ? children
        : React.Children.map(children, (child) => {
            const childText = child.props.children;
            const childTextLength = childText.length;

            const highlightIndices = match.map((v) => v - startIdx);
            startIdx += childTextLength;

            return React.cloneElement(child, {
              highlightIndices,
              highlightStyle,
            });
          })}
    </span>
  );
};
