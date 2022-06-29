/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CSSObject } from '@emotion/react';

type Props = {
  children: string;
  highlightIndices?: number[];
  highlightStyle?: CSSObject;
  role?: string;
};

// Split a text into multiple spans, each of which a single character. This is
// useful for creating inline "like" text but still having control over the blocks
// exclusive features, such height or line-height.
// It adds a `aria-label` attribute to a parent span, which is used by screen readers to
// read the text as a single block.

const css: CSSObject = {};

export const SplitText = ({
  children,
  role = 'document',
  highlightIndices,
  highlightStyle,
  ...props
}: Props) => {
  return (
    <>
      {children.split('').map(function (char, index) {
        return (
          <span
            aria-hidden="true"
            css={highlightIndices?.includes(index) ? highlightStyle : css}
            key={index}
            {...props}
          >
            {char === ' ' ? <>&nbsp;</> : char}
          </span>
        );
      })}
    </>
  );
};
