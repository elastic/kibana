/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { ImgHTMLAttributes, MutableRefObject } from 'react';
import type { EuiImageSize } from '@elastic/eui/src/components/image/image_types';
import { css } from '@emotion/react';

// Values taken from @elastic/eui/src/components/image
const sizes = {
  s: css`
    width: 100px;
  `,
  m: css`
    width: 200px;
  `,
  l: css`
    width: 360px;
  `,
  xl: css`
    width: 600px;
  `,
  original: css`
    width: auto;
  `,
  fullWidth: css`
    width: 100%;
  `,
};

export interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  hidden: boolean;
  size?: EuiImageSize;
  observerRef: (el: null | HTMLImageElement) => void;
}
export const MyImage = React.forwardRef<HTMLImageElement, Props>(
  ({ observerRef, src, hidden, size, ...rest }, ref) => {
    const styles = [
      hidden
        ? css`
            visibility: hidden;
          `
        : undefined,
      size ? sizes[size] : undefined,
    ];
    return (
      <img
        alt=""
        css={styles}
        {...rest}
        src={src}
        ref={(element) => {
          observerRef(element);
          if (ref) {
            if (typeof ref === 'function') ref(element);
            else (ref as MutableRefObject<HTMLImageElement | null>).current = element;
          }
        }}
      />
    );
  }
);
