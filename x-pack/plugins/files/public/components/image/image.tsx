/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { HTMLAttributes } from 'react';
import { type ImgHTMLAttributes, useState, useEffect } from 'react';
import { css } from '@emotion/react';
import { useViewportObserver } from './use_viewport_observer';
import { MyImage, MyImageProps, Blurhash } from './components';

export interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /**
   * A [blurhash](https://blurha.sh/) to be rendered while the image is downloading.
   */
  blurhash?: string;
  size?: MyImageProps['size'];
  /**
   * Props to pass to the wrapper element
   */
  wrapperProps?: HTMLAttributes<HTMLDivElement>;
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
  ({ src, alt, onFirstVisible, onLoad, onError, blurhash, wrapperProps, ...rest }, ref) => {
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [blurDelayExpired, setBlurDelayExpired] = useState(false);
    const { isVisible, ref: observerRef } = useViewportObserver({ onFirstVisible });

    useEffect(() => {
      const id = window.setTimeout(() => setBlurDelayExpired(true), 400);
      return () => window.clearTimeout(id);
    }, []);

    return (
      <div
        css={css`
          display: inline-block;
          position: relative;
        `}
        {...wrapperProps}
      >
        {blurDelayExpired && blurhash && <Blurhash visible={!isLoaded} hash={blurhash} />}
        <MyImage
          observerRef={observerRef}
          hidden={!isVisible}
          ref={ref}
          src={isVisible ? src : undefined}
          alt={alt}
          onLoad={(ev) => {
            setIsLoaded(true);
            onLoad?.(ev);
          }}
          onError={(ev) => {
            setIsLoaded(true);
            onError?.(ev);
          }}
          {...rest}
        />
      </div>
    );
  }
);
