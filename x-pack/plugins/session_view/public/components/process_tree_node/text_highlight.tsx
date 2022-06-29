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

export const TextHighlight = ({ children, match, text, highlightStyle }: Props): JSX.Element => {
  if (!match) {
    return <>{children}</>;
  }

  let startIdx = 0;

  return (
    <span css={css} aria-label={text} role="document">
      {React.Children.map(children, (child) => {
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
