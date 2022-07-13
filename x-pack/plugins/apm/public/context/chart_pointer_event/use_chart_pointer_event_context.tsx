/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useCallback, useRef } from 'react';
import { Chart } from '@elastic/charts';
import { PointerEvent } from '@elastic/charts';
import {
  ChartPointerEventContext,
  UPDATE_POINTER_EVENT,
} from './chart_pointer_event_context';

export function useChartPointerEventContext() {
  const context = useContext(ChartPointerEventContext);

  if (!context) {
    throw new Error('Missing ChartPointerEventContext provider');
  }

  const { pointerEventTargetRef } = context;
  const chartRef = React.createRef<Chart>();
  const requestIdRef = useRef(0);
  const updatePointerEventHandler = useCallback(
    (event: Event) => {
      cancelAnimationFrame(requestIdRef.current);
      requestIdRef.current = requestAnimationFrame(() => {
        const pointerEvent = (
          event instanceof CustomEvent ? event.detail : null
        ) as PointerEvent | null;
        if (chartRef.current && pointerEvent) {
          chartRef.current.dispatchExternalPointerEvent(pointerEvent);
        }
      });
    },
    [chartRef]
  );

  useEffect(() => {
    const pointerEventTarget = pointerEventTargetRef.current;
    pointerEventTarget.addEventListener(
      UPDATE_POINTER_EVENT,
      updatePointerEventHandler
    );
    return () => {
      pointerEventTarget.removeEventListener(
        UPDATE_POINTER_EVENT,
        updatePointerEventHandler
      );
    };
  }, [updatePointerEventHandler, pointerEventTargetRef]);
  return { ...context, chartRef };
}
