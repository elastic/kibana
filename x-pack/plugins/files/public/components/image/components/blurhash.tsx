/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { decode } from 'blurhash';
import type { FunctionComponent } from 'react';
import { useEuiTheme } from '@elastic/eui';
import React, { useRef, useEffect } from 'react';
import { css } from '@emotion/react';

interface Props {
  visible: boolean;
  hash: string;
  width: number;
  height: number;
  isContainerWidth: boolean;
}

export const Blurhash: FunctionComponent<Props> = ({
  visible,
  hash,
  width,
  height,
  isContainerWidth,
}) => {
  const ref = useRef<null | HTMLCanvasElement>(null);
  const { euiTheme } = useEuiTheme();
  useEffect(() => {
    try {
      const pixels = decode(hash, width, height);
      const ctx = ref.current!.getContext('2d')!;
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch (e) {
      // ignore if something goes wrong loading the blurhash
    }
  }, [hash, width, height]);
  return (
    <canvas
      css={css`
        top: 0;
        width: ${isContainerWidth ? '100%' : width + 'px'};
        z-index: -1;

        position: ${visible ? 'unset' : 'absolute'};
        opacity: ${visible ? 1 : 0};
        transition: opacity ${euiTheme.animation.extraFast};
      `}
      width={width}
      height={height}
      ref={ref}
    />
  );
};
