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
import { boxDimensions } from '../../common/image_metadata';

interface Props {
  visible: boolean;
  hash: string;
}

export const Blurhash: FunctionComponent<Props> = ({ visible, hash }) => {
  const ref = useRef<null | HTMLCanvasElement>(null);
  const { euiTheme } = useEuiTheme();
  useEffect(() => {
    const pixels = decode(hash, 100, 100);
    const ctx = ref.current!.getContext('2d')!;
    const imageData = ctx.createImageData(boxDimensions.width, boxDimensions.height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
  }, [hash]);
  return (
    <canvas
      css={css`
        position: absolute;
        height: 100%;
        width: 100%;
        z-index: -1;
        opacity: ${visible ? 1 : 0};
        transition: opacity ${euiTheme.animation.extraFast};
      `}
      width={32}
      height={32}
      ref={ref}
    />
  );
};
