/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { debounce } from 'lodash';
import { useCallback, useState, useEffect, useContext, useRef } from 'react';
import { SideEffectContext } from './side_effect_context';
import { useResolverDispatch } from './use_resolver_dispatch';

export function useViewMoving(): {
  isViewMoving: boolean;
  scrollWindowRef: (node: HTMLDivElement | null) => void;
} {
  const dispatch = useResolverDispatch();
  const sideEffectors = useContext(SideEffectContext);

  const [ref, setRef] = useState<null | HTMLDivElement>(null);
  const [isViewMoving, setIsViewMoving] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsMouseDown(true);
  }, []);

  const debounceViewChange = useRef(
    debounce(() => {
      console.log('fired debounce');
      dispatch({
        type: 'appReceivedNewViewPosition',
        payload: {
          time: sideEffectors.timestamp(),
        },
      });
    }, 500)
  ).current;

  const handleMouseMove = useCallback(() => {
    if (isMouseDown) {
      debounceViewChange();
      setIsViewMoving(true);
    }
  }, [isMouseDown, debounceViewChange]);

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (event.ctrlKey && event.deltaY !== 0 && event.deltaMode === 0) {
        event.preventDefault();
        debounceViewChange();
      }
    },
    [debounceViewChange]
  );

  const refCallback = useCallback((node: null | HTMLDivElement) => {
    setRef(node);
  }, []);

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

  return { isViewMoving, scrollWindowRef: refCallback };
}
