/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useCallback, useState, useEffect, useContext } from 'react';
import { SideEffectContext } from './side_effect_context';
import { useResolverDispatch } from './use_resolver_dispatch';

export function useViewMoving(): {
  isViewMoving: boolean;
  ref: (node: HTMLDivElement | null) => void;
} {
  const dispatch = useResolverDispatch();
  const sideEffectors = useContext(SideEffectContext);

  const [ref, setRef] = useState<null | HTMLDivElement>(null);

  const [elementBoundingClientRect, clientRectCallback] = useAutoUpdatingClientRect();

  const [isViewMoving, setIsViewMoving] = useState(false);

  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsMouseDown(true);
  }, []);

  const handleMouseMove = useCallback(() => {
    if (isMouseDown) {
      // TODO: if isDragging then dispatching dragging event with debounce
      setIsViewMoving(true);
    }
  }, [isMouseDown]);

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (
        elementBoundingClientRect !== null &&
        event.ctrlKey &&
        event.deltaY !== 0 &&
        event.deltaMode === 0
      ) {
        event.preventDefault();
        // TODO: have this dispatch userChangedViewPosition
        dispatch({
          type: 'userZoomed',
          payload: {
            /**
             * we use elementBoundingClientRect to interpret pixel deltas as a fraction of the element's height
             * when pinch-zooming in on a mac, deltaY is a negative number but we want the payload to be positive
             */
            zoomChange: event.deltaY / -elementBoundingClientRect.height,
            time: sideEffectors.timestamp(),
          },
        });
      }
    },
    [elementBoundingClientRect, dispatch, sideEffectors]
  );

  const refCallback = useCallback(
    (node: null | HTMLDivElement) => {
      setRef(node);
      clientRectCallback(node);
    },
    [clientRectCallback]
  );

  useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleMouseDown]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  /**
   * Register an event handler directly on `elementRef` for the `wheel` event, with no options
   * React sets native event listeners on the `window` and calls provided handlers via event propagation.
   * As of Chrome 73, `'wheel'` events on `window` are automatically treated as 'passive'.
   * If you don't need to call `event.preventDefault` then you should use regular React event handling instead.
   */
  useEffect(() => {
    if (ref !== null) {
      ref.addEventListener('wheel', handleWheel);
      return () => {
        ref.removeEventListener('wheel', handleWheel);
      };
    }
  }, [ref, handleWheel]);

  return { isViewMoving, ref: refCallback };
}

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
function useAutoUpdatingClientRect(): [DOMRect | null, (node: Element | null) => void] {
  // Access `getBoundingClientRect` via the `SideEffectContext` (for testing.)
  const { getBoundingClientRect } = useContext(SideEffectContext);

  // This hooks returns `rect`.
  const [rect, setRect] = useState<DOMRect | null>(null);

  const { ResizeObserver, requestAnimationFrame } = useContext(SideEffectContext);

  // Keep the current DOM node in state so that we can create a ResizeObserver for it via `useEffect`.
  const [currentNode, setCurrentNode] = useState<Element | null>(null);

  // `ref` will be used with a react element. When the element is available, this function will be called.
  const ref = useCallback((node: Element | null) => {
    // track the node in state
    setCurrentNode(node);
  }, []);

  /**
   * Any time the DOM node changes (to something other than `null`) recalculate the DOMRect and set it (which will cause it to be returned from the hook.
   * This effect re-runs when the DOM node has changed.
   */
  useEffect(() => {
    if (currentNode !== null) {
      // When the DOM node is received, immedaiately calculate its DOM Rect and return that
      setRect(getBoundingClientRect(currentNode));
    }
  }, [currentNode, getBoundingClientRect]);

  /**
   * When scroll events occur, recalculate the DOMRect. DOMRect represents the position of an element relative to the viewport, so that may change during scroll (depending on the layout.)
   * This effect re-runs when the DOM node has changed.
   */
  useEffect(() => {
    // the last scrollX and scrollY values that we handled
    let previousX: number = window.scrollX;
    let previousY: number = window.scrollY;

    const handleScroll = () => {
      requestAnimationFrame(() => {
        // synchronously read from the DOM
        const currentX = window.scrollX;
        const currentY = window.scrollY;

        if (currentNode !== null && (previousX !== currentX || previousY !== currentY)) {
          setRect(getBoundingClientRect(currentNode));
        }

        previousX = currentX;
        previousY = currentY;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentNode, requestAnimationFrame, getBoundingClientRect]);

  useEffect(() => {
    if (currentNode !== null) {
      const resizeObserver = new ResizeObserver((entries) => {
        if (currentNode !== null && currentNode === entries[0].target) {
          setRect(getBoundingClientRect(currentNode));
        }
      });
      resizeObserver.observe(currentNode);
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [ResizeObserver, currentNode, getBoundingClientRect]);
  return [rect, ref];
}
