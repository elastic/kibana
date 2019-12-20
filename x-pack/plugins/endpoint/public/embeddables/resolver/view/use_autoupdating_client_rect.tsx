/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import ResizeObserver from 'resize-observer-polyfill';

/** Built in typescript DOM libs and the ResizeObserver polyfill have incompatible definitions of DOMRectReadOnly so we use this basic one
 */
interface BasicDOMRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Returns a DOMRect sometimes, and a `ref` callback. Put the `ref` as the `ref` property of an element, and
 * DOMRect will be the result of getBoundingClientRect on it.
 * Updates automatically when the window resizes. TODO: better Englishe here
 */
export function useAutoUpdatingClientRect(): [BasicDOMRect | null, (node: Element | null) => void] {
  const [rect, setRect] = useState<BasicDOMRect | null>(null);
  const nodeRef = useRef<Element | null>(null);
  const ref = useCallback((node: Element | null) => {
    nodeRef.current = node;
    if (node !== null) {
      setRect(node.getBoundingClientRect());
    }
  }, []);
  useEffect(() => {
    if (nodeRef.current !== null) {
      const resizeObserver = new ResizeObserver(entries => {
        if (nodeRef.current !== null && nodeRef.current === entries[0].target) {
          setRect(nodeRef.current.getBoundingClientRect());
        }
      });
      resizeObserver.observe(nodeRef.current);
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [nodeRef]);
  return [rect, ref];
}
