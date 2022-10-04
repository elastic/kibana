/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { type ImgHTMLAttributes, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { CUSTOM_BLURHASH_HEADER } from '../../../common/constants';
import { useFilesContext } from '../context';
import { useViewportObserver } from './use_viewport_observer';
import { MyImage, Blurhash } from './components';

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
  ({ src, alt, onFirstVisible, onLoad, onError, blurhash, ...rest }, ref) => {
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [blurDelayExpired, setBlurDelayExpired] = useState(false);
    const { isVisible, ref: observerRef } = useViewportObserver({ onFirstVisible });

    useEffect(() => {
      const id = window.setTimeout(() => setBlurDelayExpired(true), 50);
      return () => window.clearTimeout(id);
    }, []);

    return (
      <div
        css={css`
          display: inline-block;
          position: relative;
        `}
        style={{
          width: rest.width ?? rest.style?.width,
          maxWidth: rest.style?.maxWidth,
          height: rest.height ?? rest.style?.height,
          maxHeight: rest.style?.maxHeight,
        }}
      >
        <Blurhash isLoaded={isLoaded} hash={hash} />
        <MyImage
          observerRef={observerRef}
          ref={ref}
          src={imgSrc}
          alt={alt}
          isLoaded={isLoaded}
          onLoad={(ev) => {
            setIsLoaded(true);
            onLoad?.(ev);
          }}
          {...rest}
        />
      </div>
    );
  }
);
