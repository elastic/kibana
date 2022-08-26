/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { MutableRefObject, useState, useRef, useEffect } from 'react';
import type { FunctionComponent, ImgHTMLAttributes, LegacyRef } from 'react';
import { Subscription } from 'rxjs';
import { createViewportObserver } from './viewport_observer';

export interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /**
   * Emits when the image first becomes visible
   */
  onFirstVisible?: () => void;
  ref?: LegacyRef<HTMLImageElement>;
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
export const Image: FunctionComponent<Props> = ({ src, alt, ref, onFirstVisible, ...rest }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [viewportObserver] = useState(() => createViewportObserver());
  const subscriptionRef = useRef<undefined | Subscription>();
  useEffect(() => () => subscriptionRef.current?.unsubscribe());
  return (
    <img
      {...rest}
      ref={(element) => {
        if (element && !subscriptionRef.current) {
          subscriptionRef.current = viewportObserver.observeElement(element).subscribe(() => {
            setIsVisible(true);
            onFirstVisible?.();
          });
        }
        if (ref) {
          if (typeof ref === 'function') ref(element);
          else (ref as MutableRefObject<HTMLImageElement | null>).current = element;
        }
      }}
      // TODO: We should have a lower resolution alternative to display
      src={isVisible ? src : undefined}
      alt={alt}
    />
  );
};
