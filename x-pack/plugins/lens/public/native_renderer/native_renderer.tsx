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

function is(x: unknown, y: unknown) {
  return (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) || (x !== x && y !== y);
}

function isShallowDifferent<T>(objA: T, objB: T): boolean {
  if (is(objA, objB)) {
    return false;
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return true;
  }

  const keysA = Object.keys(objA) as Array<keyof T>;
  const keysB = Object.keys(objB) as Array<keyof T>;

  if (keysA.length !== keysB.length) {
    return true;
  }

  for (let i = 0; i < keysA.length; i++) {
    if (!window.hasOwnProperty.call(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) {
      return true;
    }
  }

  return false;
}

/**
 * A component which takes care of providing a mountpoint for a generic render
 * function which takes an html element and an optional props object.
 * It also takes care of calling render again if the props object changes.
 * By default the mountpoint element will be a div, this can be changed with the
 * `tag` prop.
 *
 * @param props
 */
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
