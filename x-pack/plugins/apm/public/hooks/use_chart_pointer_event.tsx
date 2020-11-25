/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';
import { ChartPointerEventContext } from '../context/chart_pointer_event_context';

export function useChartPointerEvent() {
  const context = useContext(ChartPointerEventContext);

  if (!context) {
    throw new Error('Missing ChartPointerEventContext provider');
  }

  return context;
}
