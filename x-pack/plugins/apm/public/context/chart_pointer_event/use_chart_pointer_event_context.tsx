/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { Chart } from '@elastic/charts';
import { ChartPointerEventContext } from './chart_pointer_event_context';

export function useChartPointerEventContext(chartId: string) {
  const context = useContext(ChartPointerEventContext);

  if (!context) {
    throw new Error('Missing ChartPointerEventContext provider');
  }

  const { pointerEvent } = context;
  const chartRef = React.createRef<Chart>();

  useEffect(() => {
    if (pointerEvent && pointerEvent?.chartId !== chartId && chartRef.current) {
      chartRef.current.dispatchExternalPointerEvent(pointerEvent);
    }
  }, [pointerEvent, chartRef, chartId]);

  return { ...context, chartRef };
}
