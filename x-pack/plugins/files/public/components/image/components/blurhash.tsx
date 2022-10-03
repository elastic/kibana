/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FunctionComponent } from 'react';
import { useEuiTheme } from '@elastic/eui';
import React, { useRef, useEffect } from 'react';
import { css } from '@emotion/react';
import { decode } from 'blurhash';

interface Props {
  isLoaded: boolean;
  hash?: string;
}

export const Blurhash: FunctionComponent<Props> = ({ isLoaded, hash }) => {
  const ref = useRef<null | HTMLCanvasElement>(null);
  const { euiTheme } = useEuiTheme();
  useEffect(() => {
    if (!hash) return;
    const pixels = decode(hash, 100, 100);
    const ctx = ref.current!.getContext('2d')!;
    const imageData = ctx.createImageData(300, 300);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
  }, [hash]);

  if (!hash) {
    return null;
  }
  return (
    <canvas
      css={css`
        position: absolute;
        height: 100%;
        width: 100%;
        z-index: -1;
        opacity: ${isLoaded ? 0 : 1};
        transition: opacity ${euiTheme.animation.extraFast};
      `}
      width={32}
      height={32}
      ref={ref}
    />
  );
};
