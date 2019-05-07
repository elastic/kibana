/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';

export interface NativeRendererProps<T> {
  render: (domElement: Element, props: T) => void;
  actualProps: T;
  tag?: string;
  children?: never;
}

function isShallowDifferent<T>(a: T, b: T): boolean {
  for (const key in a) {
    if (!(key in b) || a[key] !== b[key]) {
      return true;
    }
  }
  for (const key in b) {
    if (!(key in a) || a[key] !== b[key]) {
      return true;
    }
  }

  return false;
}

export function NativeRenderer<T>({ render, actualProps, tag }: NativeRendererProps<T>) {
  const elementRef = useRef<Element | null>(null);
  const propsRef = useRef<T | null>(null);

  function renderAndUpdate(element: Element) {
        elementRef.current = element;
        propsRef.current = actualProps;
        render(element, actualProps);
  }

  useEffect(
    () => {
      if (elementRef.current && isShallowDifferent(propsRef.current, actualProps)) {
        renderAndUpdate(elementRef.current);
      }
    },
    [actualProps]
  );

  return React.createElement(tag || 'div', {
    ref: element => {
      if (element && element !== elementRef.current) {
        renderAndUpdate(element);
      }
    },
  });
}

NativeRenderer.propTypes = {
  render: PropTypes.func.isRequired,
  actualProps: PropTypes.object,
  
  tag: PropTypes.string
};