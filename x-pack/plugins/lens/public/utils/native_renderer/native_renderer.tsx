/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef } from 'react';

export interface NativeRendererProps<T> {
  render: (domElement: Element, props: T) => void;
  nativeProps: T;
  tag?: string;
  children?: never;
}

function isShallowDifferent<T>(a: T, b: T): boolean {
  if (a === b) {
    return false;
  }

  if (Object.keys(a).length !== Object.keys(b).length) {
    return true;
  }

  for (const key in a) {
    if (!(key in b) || a[key] !== b[key]) {
      return true;
    }
  }

  return false;
}

export function NativeRenderer<T>({ render, nativeProps, tag }: NativeRendererProps<T>) {
  const elementRef = useRef<Element | null>(null);
  const propsRef = useRef<T | null>(null);

  function renderAndUpdate(element: Element) {
    elementRef.current = element;
    propsRef.current = nativeProps;
    render(element, nativeProps);
  }

  useEffect(
    () => {
      if (elementRef.current && isShallowDifferent(propsRef.current, nativeProps)) {
        renderAndUpdate(elementRef.current);
      }
    },
    [nativeProps]
  );

  return React.createElement(tag || 'div', {
    ref: element => {
      if (element && element !== elementRef.current) {
        renderAndUpdate(element);
      }
    },
  });
}
