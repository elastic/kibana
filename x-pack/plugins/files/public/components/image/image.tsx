/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { HTMLAttributes } from 'react';
import { type ImgHTMLAttributes, useState, useEffect } from 'react';
import { css } from '@emotion/react';
import type { FileImageMetadata } from '../../../common';
import { useViewportObserver } from './use_viewport_observer';
import { Img, type ImgProps, Blurhash } from './components';
import { sizes } from './styles';

export interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /**
   * Image metadata
   */
  meta?: FileImageMetadata;

  /**
   * @default original
   */
  size?: ImgProps['size'];
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
  (
    { src, alt, onFirstVisible, onLoad, onError, meta, wrapperProps, size = 'original', ...rest },
    ref
  ) => {
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [blurDelayExpired, setBlurDelayExpired] = useState(false);
    const { isVisible, ref: observerRef } = useViewportObserver({ onFirstVisible });

    useEffect(() => {
      let unmounted = false;
      const id = window.setTimeout(() => {
        if (!unmounted) setBlurDelayExpired(true);
      }, 200);
      return () => {
        unmounted = true;
        window.clearTimeout(id);
      };
    }, []);

    const knownSize = size ? sizes[size] : undefined;

    return (
      <div
        css={[
          css`
            position: relative;
            display: inline-block;
          `,
          knownSize,
        ]}
        {...wrapperProps}
      >
        {blurDelayExpired && meta?.blurhash && (
          <Blurhash
            visible={!isLoaded}
            hash={meta.blurhash}
            isContainerWidth={size !== 'original' && size !== undefined}
            width={meta.width}
            height={meta.height}
          />
        )}
        <Img
          observerRef={observerRef}
          ref={ref}
          size={size}
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
