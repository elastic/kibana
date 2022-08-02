/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FETCH_STATUS } from '../../hooks/use_fetcher';
import { useTimeRangeMetadata } from './use_time_range_metadata_context';

export function useSearchServiceDestinationMetrics({
  rangeFrom,
  rangeTo,
  kuery,
}: {
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
}) {
  const { status, data } = useTimeRangeMetadata({
    rangeFrom,
    rangeTo,
    kuery,
  });

  return {
    isTimeRangeMetadataLoading: status === FETCH_STATUS.LOADING,
    searchServiceDestinationMetrics:
      data?.isUsingServiceDestinationMetrics ?? true,
  };
}
