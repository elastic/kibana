/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { TimeRangeMetadataContext } from './time_range_metadata_context';

export function useTimeRangeMetadata({
  start,
  end,
  kuery,
}: {
  // require parameters to enforce type-safety. Only components
  // with access to rangeFrom and rangeTo should be able to request
  // time range metadata.
  start: string;
  end: string;
  kuery: string;
}) {
  const context = useContext(TimeRangeMetadataContext);

  if (!context) {
    throw new Error('TimeRangeMetadataContext is not found');
  }

  return context;
}
