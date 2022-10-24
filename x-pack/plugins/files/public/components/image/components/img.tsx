/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { ImgHTMLAttributes, MutableRefObject } from 'react';
import type { EuiImageSize } from '@elastic/eui/src/components/image/image_types';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { sizes } from '../styles';

export interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  size?: EuiImageSize;
  observerRef: (el: null | HTMLImageElement) => void;
}

export const Img = React.forwardRef<HTMLImageElement, Props>(
  ({ observerRef, src, size, ...rest }, ref) => {
    const { euiTheme } = useEuiTheme();
    const styles = [
      css`
        transition: opacity ${euiTheme.animation.extraFast};
      `,
      !src
        ? css`
            position: absolute;
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
