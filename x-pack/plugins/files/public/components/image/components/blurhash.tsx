/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { decode } from 'blurhash';
import React, { useRef, useEffect } from 'react';
import type { FunctionComponent } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { fitToBox } from '../../util';

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
  const ref = useRef<null | HTMLImageElement>(null);
  const { euiTheme } = useEuiTheme();
  useEffect(() => {
    try {
      const { width: blurWidth, height: blurHeight } = fitToBox(width, height);
      const canvas = document.createElement('canvas');
      canvas.width = blurWidth;
      canvas.height = blurHeight;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(blurWidth, blurHeight);
      imageData.data.set(decode(hash, blurWidth, blurHeight));
      ctx.putImageData(imageData, 0, 0);
      ref.current!.src = canvas.toDataURL();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }, [hash, width, height]);
  return (
    <img
      alt=""
      css={css`
        top: 0;
        width: ${isContainerWidth ? '100%' : width + 'px'};
        z-index: -1;

        position: ${visible ? 'unset' : 'absolute'};
        opacity: ${visible ? 1 : 0};
        transition: opacity ${euiTheme.animation.extraFast};
      `}
      ref={ref}
    />
  );
};
