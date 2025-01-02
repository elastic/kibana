/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext } from 'react';
import {
  apmEnableServiceMetrics,
  apmEnableContinuousRollups,
} from '@kbn/observability-plugin/common';
import { IUiSettingsClient } from '@kbn/core/public';
import { TimeRangeMetadata } from '../../../common/time_range_metadata';
import { useApmParams } from '../../hooks/use_apm_params';
import { useApmRoutePath } from '../../hooks/use_apm_route_path';
import { FetcherResult, useFetcher } from '../../hooks/use_fetcher';
import { useTimeRange } from '../../hooks/use_time_range';
import { useApmPluginContext } from '../apm_plugin/use_apm_plugin_context';

export const TimeRangeMetadataContext = createContext<FetcherResult<TimeRangeMetadata> | undefined>(
  undefined
);

export function ApmTimeRangeMetadataContextProvider({ children }: { children?: React.ReactNode }) {
  const {
    core: { uiSettings },
  } = useApmPluginContext();

  const { query } = useApmParams('/*');

  const kuery = 'kuery' in query && query.kuery ? query.kuery : '';

  const range =
    'rangeFrom' in query && 'rangeTo' in query
      ? { rangeFrom: query.rangeFrom, rangeTo: query.rangeTo }
      : undefined;

  if (!range) {
    throw new Error('rangeFrom/rangeTo missing in URL');
  }

  const { start, end } = useTimeRange(range);

  const routePath = useApmRoutePath();

  const isOperationView =
    routePath.startsWith('/dependencies/operation') ||
    routePath.startsWith('/dependencies/operations');

  return (
    <TimeRangeMetadataContextProvider
      uiSettings={uiSettings}
      useSpanName={isOperationView}
      start={start}
      end={end}
      kuery={kuery}
    >
      {children}
    </TimeRangeMetadataContextProvider>
  );
}

export function TimeRangeMetadataContextProvider({
  children,
  uiSettings,
  useSpanName,
  start,
  end,
  kuery,
}: {
  children?: React.ReactNode;
  uiSettings: IUiSettingsClient;
  useSpanName: boolean;
  start: string;
  end: string;
  kuery: string;
}) {
  const enableServiceTransactionMetrics = uiSettings.get<boolean>(apmEnableServiceMetrics, true);

  const enableContinuousRollups = uiSettings.get<boolean>(apmEnableContinuousRollups, true);

  const fetcherResult = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/time_range_metadata', {
        params: {
          query: {
            start,
            end,
            kuery,
            useSpanName,
            enableServiceTransactionMetrics,
            enableContinuousRollups,
          },
        },
      });
    },
    [start, end, kuery, useSpanName, enableServiceTransactionMetrics, enableContinuousRollups]
  );

  return (
    <TimeRangeMetadataContext.Provider value={fetcherResult}>
      {children}
    </TimeRangeMetadataContext.Provider>
  );
}
