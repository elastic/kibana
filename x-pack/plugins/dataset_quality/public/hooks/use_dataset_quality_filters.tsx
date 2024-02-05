/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnRefreshChangeProps } from '@elastic/eui';
import { useSelector } from '@xstate/react';
import { useCallback } from 'react';
import { useDatasetQualityContext } from '../components/dataset_quality/context';

export const useDatasetQualityFilters = () => {
  const { service } = useDatasetQualityContext();

  const { timeRange } = useSelector(service, (state) => state.context.filters);

  const onTimeChange = useCallback(
    (selectedTime: { start: string; end: string; isInvalid: boolean }) => {
      if (selectedTime.isInvalid) {
        return;
      }

      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          ...timeRange,
          from: selectedTime.start,
          to: selectedTime.end,
        },
      });
    },
    [service, timeRange]
  );

  const onRefresh = useCallback(() => {
    service.send({
      type: 'REFRESH_DATA',
    });
  }, [service]);

  const onRefreshChange = useCallback(
    ({ refreshInterval, isPaused }: OnRefreshChangeProps) => {
      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          ...timeRange,
          refresh: {
            isPaused,
            interval: refreshInterval,
          },
        },
      });
    },
    [service, timeRange]
  );

  return {
    timeRange,
    onTimeChange,
    onRefresh,
    onRefreshChange,
  };
};
