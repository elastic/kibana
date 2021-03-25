/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { HTMLAttributes, useEffect, useRef } from 'react';
import { unmountComponentAtNode } from 'react-dom';

type CleanupCallback = (el: Element) => void;

export interface NativeRendererProps<T> extends HTMLAttributes<HTMLDivElement> {
  render: (
    domElement: Element,
    props: T
  ) => Promise<CleanupCallback | void> | CleanupCallback | void;
  nativeProps: T;
  tag?: string;
}

/**
 * A component which takes care of providing a mountpoint for a generic render
 * function which takes an html element and an optional props object.
 * By default the mountpoint element will be a div, this can be changed with the
 * `tag` prop.
 *
 * If the rendered component tree was using React, we need to clean it up manually,
 * otherwise the unmount event never happens. A future addition is for non-React components
 * to get cleaned up, which could be added in the future.
 *
 * @param props
 */
export function NativeRenderer<T>({ render, nativeProps, tag, ...rest }: NativeRendererProps<T>) {
  const elementRef = useRef<Element>();
  const cleanupRef = useRef<((cleanupElement: Element) => void) | void>();
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        if (cleanupRef.current && typeof cleanupRef.current === 'function') {
          cleanupRef.current(elementRef.current);
        }
        unmountComponentAtNode(elementRef.current);
      }
    };
  }, []);
  return React.createElement(tag || 'div', {
    ...rest,
    ref: (el) => {
      if (el) {
        elementRef.current = el;
        // Handles the editor frame renderer, which is async
        const result = render(el, nativeProps);
        if (result instanceof Promise) {
          result.then((cleanup) => {
            if (typeof cleanup === 'function') {
              cleanupRef.current = cleanup;
            }
          });
        } else if (typeof result === 'function') {
          cleanupRef.current = result;
        }
      }
    },
  });
}
