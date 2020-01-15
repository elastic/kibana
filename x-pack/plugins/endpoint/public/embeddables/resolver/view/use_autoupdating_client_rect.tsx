/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import ResizeObserver from 'resize-observer-polyfill';

/**
 * Returns a nullable DOMRect and a ref callback. Pass the refCallback to the
 * `ref` property of a native element and this hook will return a DOMRect for
 * it by calling `getBoundingClientRect`. This hook will observe the element
 * with a resize observer and call getBoundingClientRect again after resizes.
 *
 * Note that the changes to the position of the element aren't automatically
 * tracked. So if the element's position moves for some reason, be sure to
 * handle that.
 */
export function useAutoUpdatingClientRect(): [DOMRect | null, (node: Element | null) => void] {
  const [rect, setRect] = useState<DOMRect | null>(null);
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
