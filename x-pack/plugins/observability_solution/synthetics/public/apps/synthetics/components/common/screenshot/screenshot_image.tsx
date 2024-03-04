/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, MouseEventHandler } from 'react';
import { useEuiTheme, EuiThemeComputed } from '@elastic/eui';

import { EmptyThumbnail } from './empty_thumbnail';
import { getConfinedScreenshotSize, ScreenshotImageSize } from './screenshot_size';

const DEFAULT_SIZE: [number, number] = [512, 512];

export interface ScreenshotImageProps {
  label?: string;
  isLoading: boolean;
  animateLoading?: boolean;
  size?: ScreenshotImageSize;
  unavailableMessage?: string;
  borderColor?: EuiThemeComputed['border']['color'];
  borderRadius?: string | number;
  hasBorder?: boolean;
  onMouseEnter?: MouseEventHandler<HTMLImageElement>;
  onMouseLeave?: MouseEventHandler<HTMLImageElement>;
  onClick?: MouseEventHandler<HTMLImageElement>;
}

export const ScreenshotImage: React.FC<ScreenshotImageProps & { imgSrc?: string }> = ({
  label,
  imgSrc,
  isLoading,
  animateLoading = true,
  unavailableMessage,
  borderColor,
  borderRadius,
  hasBorder = true,
  size = [100, 64],
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const [naturalSize, setNaturalSize] = useState<[number, number]>(DEFAULT_SIZE);
  const { width, height } = getConfinedScreenshotSize(size, naturalSize);

  return imgSrc ? (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <img
      css={{
        outline: 0,
        objectFit: 'contain',
        width,
        height,
        cursor: 'pointer',
        border: euiTheme.border.thin,
        ...(borderColor ? { borderColor } : {}),
        ...(borderRadius ? { borderRadius } : {}),
        ...(!hasBorder ? { borderRadius } : {}),
        ...(borderColor ? { borderColor } : {}),
      }}
      src={imgSrc}
      alt={label}
      data-test-subj="stepScreenshotThumbnail"
      onLoad={(evt) => {
        const updatedSize: [number, number] = [
          (evt?.target as HTMLImageElement)?.naturalWidth ?? naturalSize[0],
          (evt?.target as HTMLImageElement)?.naturalHeight ?? naturalSize[1],
        ];
        setNaturalSize(updatedSize);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={undefined}
    />
  ) : (
    <EmptyThumbnail
      isLoading={isLoading}
      size={size === 'full' ? naturalSize : size}
      unavailableMessage={unavailableMessage}
      borderRadius={borderRadius}
      animateLoading={animateLoading}
    />
  );
};
