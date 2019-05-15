/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef, useState } from 'react';
import { Delayed } from './Delayed';

export function useDelayedVisibility(
  visible: boolean,
  hideDelayMs?: number,
  showDelayMs?: number,
  minimumVisibleDuration?: number
) {
  const [isVisible, setIsVisible] = useState(false);
  const delayedRef = useRef<Delayed | null>(null);

  useEffect(
    () => {
      const delayed = new Delayed({
        hideDelayMs,
        showDelayMs,
        minimumVisibleDuration
      });
      delayed.onChange(visibility => {
        setIsVisible(visibility);
      });
      delayedRef.current = delayed;
    },
    [hideDelayMs, showDelayMs, minimumVisibleDuration]
  );

  useEffect(
    () => {
      if (!delayedRef.current) {
        return;
      }

      if (visible) {
        delayedRef.current.show();
      } else {
        delayedRef.current.hide();
      }
    },
    [visible]
  );

  return isVisible;
}
