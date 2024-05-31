/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { TimeRangeContext } from '../components/contexts/time_range_context';

export function useTimeRangeContext() {
  const context = useContext(TimeRangeContext);

  if (!context) {
    throw new Error('TimeRangeContext was not provided');
  }

  return context;
}
