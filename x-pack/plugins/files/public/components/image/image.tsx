/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { ImgHTMLAttributes } from 'react';
import { useViewportObserver } from './use_viewport_observer';
import { MyImage } from './components/my_img';

export interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /**
   * Emits when the image first becomes visible
   */
  onFirstVisible?: () => void;
}

/**
 * A viewport-aware component that displays an image. This component is a very
 * thin wrapper around the img tag.
 *
 * @note Intended to be used with files like:
 *
 * ```ts
 * <Image src={file.getDownloadSrc(file)} ... />
 * ```
 */
export const Image = React.forwardRef<HTMLImageElement, Props>(
  ({ src, alt, onFirstVisible, ...rest }, ref) => {
    const { isVisible, ref: observerRef } = useViewportObserver({ onFirstVisible });
    return (
      <div>
        <MyImage
          observerRef={observerRef}
          ref={ref}
          src={isVisible ? src : undefined}
          alt={alt}
          {...rest}
        />
      </div>
    );
  }
);
