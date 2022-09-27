/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImgHTMLAttributes, MutableRefObject } from 'react';
import React from 'react';

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  observerRef: (el: null | HTMLImageElement) => void;
}

export const MyImage = React.forwardRef<HTMLImageElement, Props>(
  ({ observerRef, ...rest }, ref) => {
    return (
      <img
        alt=""
        {...rest}
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
