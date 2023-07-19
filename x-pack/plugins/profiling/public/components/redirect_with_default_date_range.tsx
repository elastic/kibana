/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useDateRangeRedirect } from '../hooks/use_default_date_range_redirect';

export function RedirectWithDefaultDateRange({ children }: { children: React.ReactElement }) {
  const { redirect, isDateRangeSet, skipDataRangeSet } = useDateRangeRedirect();

  if (isDateRangeSet || skipDataRangeSet) {
    return children;
  }

  redirect();

  return null;
}
