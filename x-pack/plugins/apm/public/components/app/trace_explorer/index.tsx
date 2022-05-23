/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  TraceSearchQuery,
  TraceSearchType,
} from '../../../../common/trace_explorer';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher, FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ApmDatePicker } from '../../shared/date_picker/apm_date_picker';
import { fromQuery, toQuery, push } from '../../shared/links/url_helpers';
import { useWaterfallFetcher } from '../transaction_details/use_waterfall_fetcher';
import { WaterfallWithSummary } from '../transaction_details/waterfall_with_summary';
import { TraceSearchBox } from './trace_search_box';

export function TraceExplorer() {
  const [query, setQuery] = useState<TraceSearchQuery>({
    query: '',
    type: TraceSearchType.kql,
  });

  const {
    query: {
      rangeFrom,
      rangeTo,
      environment,
      query: queryFromUrlParams,
      type: typeFromUrlParams,
      traceId,
      transactionId,
      waterfallItemId,
      detailTab,
    },
  } = useApmParams('/traces/explorer');

  const history = useHistory();

  useEffect(() => {
    setQuery({
      query: queryFromUrlParams,
      type: typeFromUrlParams,
    });
  }, [queryFromUrlParams, typeFromUrlParams]);

  const { start, end } = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  const { data: traceSamplesData, status: traceSamplesStatus } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/traces/find', {
        params: {
          query: {
            start,
            end,
            environment,
            query: queryFromUrlParams,
            type: typeFromUrlParams,
          },
        },
      });
    },
    [start, end, environment, queryFromUrlParams, typeFromUrlParams]
  );

  useEffect(() => {
    const nextSample = traceSamplesData?.samples[0];
    const nextWaterfallItemId = '';
    history.replace({
      ...history.location,
      search: fromQuery({
        ...toQuery(history.location.search),
        traceId: nextSample?.traceId ?? '',
        transactionId: nextSample?.transactionId,
        waterfallItemId: nextWaterfallItemId,
      }),
    });
  }, [traceSamplesData, history]);

  const { waterfall, status: waterfallStatus } = useWaterfallFetcher({
    traceId,
    transactionId,
    start,
    end,
  });

  const isLoading =
    traceSamplesStatus === FETCH_STATUS.LOADING ||
    waterfallStatus === FETCH_STATUS.LOADING;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <EuiFlexItem grow>
            <TraceSearchBox
              query={query}
              error={false}
              loading={false}
              onQueryCommit={() => {
                history.push({
                  ...history.location,
                  search: fromQuery({
                    ...toQuery(history.location.search),
                    query: query.query,
                    type: query.type,
                  }),
                });
              }}
              onQueryChange={(nextQuery) => {
                setQuery(nextQuery);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ApmDatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <WaterfallWithSummary
          environment={environment}
          isLoading={isLoading}
          onSampleClick={(sample) => {
            push(history, {
              query: {
                traceId: sample.traceId,
                transactionId: sample.transactionId,
                waterfallItemId: '',
              },
            });
          }}
          onTabClick={(nextDetailTab) => {
            push(history, {
              query: {
                detailTab: nextDetailTab,
              },
            });
          }}
          traceSamples={traceSamplesData?.samples ?? []}
          waterfall={waterfall}
          detailTab={detailTab}
          waterfallItemId={waterfallItemId}
          serviceName={waterfall.entryWaterfallTransaction?.doc.service.name}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
