/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  TraceSearchQuery,
  TraceSearchType,
} from '../../../../common/trace_explorer';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher } from '../../../hooks/use_fetcher';
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
      showCriticalPath,
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

  const { data, status, error } = useFetcher(
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
    const nextSample = data?.traceSamples[0];
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
  }, [data, history]);

  const waterfallFetchResult = useWaterfallFetcher({
    traceId,
    transactionId,
    start,
    end,
  });

  const traceSamplesFetchResult = useMemo(
    () => ({
      data,
      status,
      error,
    }),
    [data, status, error]
  );

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
          waterfallFetchResult={waterfallFetchResult}
          traceSamples={traceSamplesFetchResult.data?.traceSamples}
          traceSamplesFetchStatus={traceSamplesFetchResult.status}
          environment={environment}
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
          detailTab={detailTab}
          waterfallItemId={waterfallItemId}
          serviceName={
            waterfallFetchResult.waterfall.entryWaterfallTransaction?.doc
              .service.name
          }
          showCriticalPath={showCriticalPath}
          onShowCriticalPathChange={(nextShowCriticalPath) => {
            push(history, {
              query: {
                showCriticalPath: nextShowCriticalPath ? 'true' : 'false',
              },
            });
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
