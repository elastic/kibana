/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { ENVIRONMENT_ALL } from '../../../../../../common/environment_filter_values';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { UseTraceQueryState } from '../../../../../hooks/use_trace_query';
import { useWaterfallFetcher } from '../../../transaction_details/use_waterfall_fetcher';
import { WaterfallWithSummary } from '../../../transaction_details/waterfall_with_summary';

function TraceSampleContainer({
  queryState,
}: {
  queryState: UseTraceQueryState;
}) {
  const [selectedSample, setSelectedSample] = useState<
    { traceId: string; transactionId: string } | undefined
  >();

  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/trace-explorer');

  const { start, end } = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  const { waterfall, status } = useWaterfallFetcher({
    start,
    end,
    traceId: selectedSample?.traceId,
    transactionId: selectedSample?.transactionId,
  });

  useEffect(() => {
    setSelectedSample(queryState.traceSearchState?.fragments.samples.data?.[0]);
  }, [queryState.traceSearchState?.fragments.samples.data]);

  return (
    <WaterfallWithSummary
      environment={
        queryState.traceSearchState?.params.environment ?? ENVIRONMENT_ALL.value
      }
      isLoading={
        queryState.traceSearchStateLoading ||
        queryState.traceSearchState?.fragments.samples.isRunning === true ||
        status === FETCH_STATUS.LOADING
      }
      onSampleClick={(sample) => {
        setSelectedSample(sample);
      }}
      onTabClick={() => {}}
      traceSamples={queryState.traceSearchState?.fragments.samples.data ?? []}
      waterfall={waterfall}
    />
  );
}

export function TraceSamples({
  foreground,
  background,
}: {
  foreground: UseTraceQueryState;
  background: UseTraceQueryState;
}) {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <TraceSampleContainer queryState={foreground} />
      </EuiFlexItem>
      {background.traceSearchState ? (
        <EuiFlexItem>
          <TraceSampleContainer queryState={background} />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
