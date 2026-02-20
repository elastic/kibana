/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { omit, orderBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useDependencyDetailOperationsBreadcrumb } from '../../../hooks/use_dependency_detail_operations_breadcrumb';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { DependencyMetricCharts } from '../../shared/dependency_metric_charts';
import { ResettingHeightRetainer } from '../../shared/height_retainer/resetting_height_container';
import { push, replace } from '../../shared/links/url_helpers';
import { useWaterfallFetcher } from '../transaction_details/use_waterfall_fetcher';
import { WaterfallWithSummary } from '../transaction_details/waterfall_with_summary';
import type { TransactionTab } from '../transaction_details/waterfall_with_summary/transaction_tabs';
import { DependencyOperationDistributionChart } from './dependency_operation_distribution_chart';
import { DetailViewHeader } from './detail_view_header';
import { maybeRedirectToAvailableSpanSample } from './maybe_redirect_to_available_span_sample';

export function DependencyOperationDetailView() {
  const router = useApmRouter();

  const history = useHistory();

  const {
    query,
    query: {
      spanName,
      dependencyName,
      sampleRangeFrom,
      sampleRangeTo,
      kuery,
      environment,
      rangeFrom,
      rangeTo,
      spanId,
      waterfallItemId,
      detailTab,
      sortField = '@timestamp',
      sortDirection = 'desc',
      showCriticalPath,
    },
  } = useApmParams('/dependencies/operation');

  useDependencyDetailOperationsBreadcrumb({
    title: spanName,
    href: router.link('/dependencies/operation', {
      query,
    }),
  });

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const queryWithoutSpanName = omit(query, 'spanName');

  const spanFetch = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/dependencies/operations/spans', {
        params: {
          query: {
            dependencyName,
            spanName,
            start,
            end,
            environment,
            kuery,
            sampleRangeFrom,
            sampleRangeTo,
          },
        },
      });
    },
    [dependencyName, spanName, start, end, environment, kuery, sampleRangeFrom, sampleRangeTo]
  );

  const samples = useMemo(() => {
    return (
      orderBy(spanFetch.data?.spans ?? [], sortField, sortDirection).map((span) => ({
        spanId: span.spanId,
        traceId: span.traceId,
        transactionId: span.transactionId,
      })) || []
    );
  }, [spanFetch.data?.spans, sortField, sortDirection]);

  const selectedSample = useMemo(() => {
    return samples.find((sample) => sample.spanId === spanId);
  }, [samples, spanId]);

  const waterfallFetch = useWaterfallFetcher({
    traceId: selectedSample?.traceId,
    transactionId: selectedSample?.transactionId,
    start,
    end,
  });

  const queryRef = useRef(query);

  queryRef.current = query;

  useEffect(() => {
    maybeRedirectToAvailableSpanSample({
      history,
      page: queryRef.current.page ?? 0,
      pageSize: queryRef.current.pageSize ?? 10,
      replace,
      samples,
      spanFetchStatus: spanFetch.status,
      spanId,
    });
  }, [samples, spanId, history, queryRef, router, spanFetch.status]);

  const isWaterfallLoading =
    spanFetch.status === FETCH_STATUS.NOT_INITIATED ||
    (spanFetch.status === FETCH_STATUS.LOADING && samples.length === 0) ||
    (waterfallFetch.status === FETCH_STATUS.LOADING &&
      !waterfallFetch.waterfall.entryWaterfallTransaction);

  const onSampleClick = useCallback(
    (sample: any) => {
      push(history, { query: { spanId: sample.spanId } });
    },
    [history]
  );

  const onTabClick = useCallback(
    (nextDetailTab: TransactionTab) => {
      push(history, {
        query: {
          detailTab: nextDetailTab,
        },
      });
    },
    [history]
  );

  const onShowCriticalPathChange = useCallback(
    (nextShowCriticalPath: boolean) => {
      push(history, {
        query: {
          showCriticalPath: nextShowCriticalPath ? 'true' : 'false',
        },
      });
    },
    [history]
  );

  const queryParams = useMemo(
    () => ({
      kuery,
      spanName,
      dependencyName,
      sampleRangeFrom,
      sampleRangeTo,
    }),
    [kuery, spanName, dependencyName, sampleRangeFrom, sampleRangeTo]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <DetailViewHeader
          backLabel={i18n.translate('xpack.apm.dependecyOperationDetailView.header.backLinkLabel', {
            defaultMessage: 'All operations',
          })}
          backHref={router.link('/dependencies/operations', {
            query: queryWithoutSpanName,
          })}
          title={spanName}
        />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <ChartPointerEventContextProvider>
          <DependencyMetricCharts />
        </ChartPointerEventContextProvider>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <DependencyOperationDistributionChart />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <ResettingHeightRetainer reset={!isWaterfallLoading}>
            <WaterfallWithSummary
              environment={environment}
              waterfallFetchResult={waterfallFetch.waterfall}
              waterfallFetchStatus={waterfallFetch.status}
              traceSamples={samples}
              traceSamplesFetchStatus={spanFetch.status}
              onSampleClick={onSampleClick}
              onTabClick={onTabClick}
              serviceName={waterfallFetch.waterfall.entryWaterfallTransaction?.doc.service.name}
              waterfallItemId={waterfallItemId}
              detailTab={detailTab}
              selectedSample={selectedSample || null}
              showCriticalPath={showCriticalPath}
              onShowCriticalPathChange={onShowCriticalPathChange}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              queryParams={queryParams}
            />
          </ResettingHeightRetainer>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
