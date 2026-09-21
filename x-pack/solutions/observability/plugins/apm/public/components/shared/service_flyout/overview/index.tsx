/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ServiceFlyoutTransactionsSection, type TransactionGroup } from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { SERVICE_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import type { LensESQLConfig } from './types';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { useServiceFlyoutContext } from '../service_flyout_context';
import { LatencyAggregationTypeSelect } from '../../charts/latency_chart/latency_aggregation_type_select';
import { useServiceHasSystemMetrics } from '../hooks/use_service_has_system_metrics';
import { useProjectRouting } from '../hooks/use_project_routing';
import { TransactionDetailFlyout } from '../../transaction_detail_flyout';
import { ServiceFlyoutApmCharts } from './apm_charts';
import { getEsqlKeyMetricCharts, getInfrastructureMetricCharts } from './chart_configs';
import { ServiceFlyoutLensChart } from './lens_chart';
import { ServiceFlyoutQueryControls } from './query_controls';

/** Selection + applied filters for the nested flyout (frozen when selection is stale). */
interface SelectedTransactionDetail {
  transactionName: string;
  transactionType: string;
  filters: {
    environment: string;
    rangeFrom: string;
    rangeTo: string;
    start: string;
    end: string;
    transactionType: string;
  };
  isFiltersStale: boolean;
}

function isSameAppliedFilters(
  a: SelectedTransactionDetail['filters'],
  b: SelectedTransactionDetail['filters']
): boolean {
  return (
    a.environment === b.environment &&
    a.rangeFrom === b.rangeFrom &&
    a.rangeTo === b.rangeTo &&
    a.start === b.start &&
    a.end === b.end &&
    a.transactionType === b.transactionType
  );
}

const KEY_METRICS_SECTION_TITLE = i18n.translate('xpack.apm.serviceFlyout.keyMetricsSectionTitle', {
  defaultMessage: 'Key metrics',
});

const INFRASTRUCTURE_METRICS_SECTION_TITLE = i18n.translate(
  'xpack.apm.serviceFlyout.infrastructureMetricsSectionTitle',
  { defaultMessage: 'Infrastructure metrics' }
);

const CHARTS_LOAD_ERROR = i18n.translate('xpack.apm.serviceFlyout.chartsUnavailable', {
  defaultMessage: 'Unable to load charts',
});

const INFRASTRUCTURE_METRICS_SECTION_DESCRIPTION = i18n.translate(
  'xpack.apm.serviceFlyout.infrastructureMetricsSectionTooltip',
  {
    defaultMessage:
      'Infrastructure metrics reflect system-level data and are not filtered by transaction type.',
  }
);

function LensChartsSkeleton({
  count,
  'data-test-subj': testSubj,
}: {
  count: number;
  'data-test-subj': string;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      data-test-subj={testSubj}
      css={css`
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: ${euiTheme.size.m};
      `}
    >
      {Array.from({ length: count }, (_, i) => (
        <EuiSkeletonRectangle key={i} width="100%" height={200} borderRadius="m" />
      ))}
    </div>
  );
}

interface FlyoutLensChartDefinition {
  id: string;
  title: string;
  titleAction?: React.ReactNode;
  config?: LensESQLConfig;
}

function ServiceFlyoutSectionTitle({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description?: string;
}) {
  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        responsive={false}
        data-test-subj={`serviceFlyoutSection-${id}`}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {description && (
          <EuiFlexItem grow={false}>
            <EuiIconTip content={description} size="s" color="subdued" aria-label={description} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
}

function ServiceFlyoutChartsSection({
  id,
  title,
  description,
  charts,
  isLoading,
  hasError,
  rangeFrom,
  rangeTo,
  refreshToken,
}: {
  id: string;
  title: string;
  description?: string;
  charts: FlyoutLensChartDefinition[];
  isLoading: boolean;
  hasError: boolean;
  rangeFrom: string;
  rangeTo: string;
  refreshToken: number;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <ServiceFlyoutSectionTitle id={id} title={title} description={description} />
      {isLoading ? (
        <LensChartsSkeleton
          count={charts.length}
          data-test-subj={`serviceFlyoutSection-${id}-skeleton`}
        />
      ) : hasError ? (
        <KbnWarningCallout
          size="s"
          data-test-subj={`serviceFlyoutSection-${id}-error`}
          title={CHARTS_LOAD_ERROR}
        />
      ) : (
        <div
          css={css`
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: ${euiTheme.size.m};
          `}
        >
          {charts.map((chart) => (
            <ServiceFlyoutLensChart
              key={chart.id}
              id={chart.id}
              title={chart.title}
              titleAction={chart.titleAction}
              config={chart.config}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              refreshToken={refreshToken}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function ServiceFlyoutOverview() {
  const [selectedTransaction, setSelectedTransaction] = useState<SelectedTransactionDetail | null>(
    null
  );
  const {
    deps: { core, share, lens, dataViews },
    contextActions,
    service,
    capabilities,
    indices,
    flyoutHistoryKey,
    preferDocumentBasedCharts,
    filters: {
      environment,
      rangeFrom,
      rangeTo,
      start,
      end,
      transactionType,
      refreshToken,
      latencyAggregationType: initialLatencyAggregationType,
    },
  } = useServiceFlyoutContext();
  const [latencyAggregationType, setLatencyAggregationType] = useState(
    initialLatencyAggregationType ?? LatencyAggregationType.avg
  );
  const { hasSystemMetrics, isLoading: isSystemMetricsLoading } = useServiceHasSystemMetrics({
    serviceName: service.name,
    environment,
    rangeFrom,
    rangeTo,
  });
  // CPS: pass project routing to ES|QL charts and the transactions table HTTP calls
  // so they query the same projects as APM APIs (`x-project-routing`).
  const projectRouting = useProjectRouting();

  const liveTransactionFilters = useMemo(
    () => ({
      environment,
      rangeFrom,
      rangeTo,
      start,
      end,
      transactionType: transactionType ?? '',
    }),
    [environment, rangeFrom, rangeTo, start, end, transactionType]
  );

  const liveFiltersKey = useMemo(
    () =>
      [
        liveTransactionFilters.environment,
        liveTransactionFilters.rangeFrom,
        liveTransactionFilters.rangeTo,
        liveTransactionFilters.start,
        liveTransactionFilters.end,
        liveTransactionFilters.transactionType,
      ].join('|'),
    [liveTransactionFilters]
  );

  // Track filter changes during render so child effects cannot reconcile against a
  // stale transactions list before we mark reconciliation as pending.
  const pendingFilterReconcileRef = useRef(false);
  const seenLoadingSincePendingRef = useRef(false);
  const prevLiveFiltersKeyRef = useRef(liveFiltersKey);

  if (!selectedTransaction) {
    pendingFilterReconcileRef.current = false;
    seenLoadingSincePendingRef.current = false;
    prevLiveFiltersKeyRef.current = liveFiltersKey;
  } else if (prevLiveFiltersKeyRef.current !== liveFiltersKey) {
    pendingFilterReconcileRef.current = true;
    seenLoadingSincePendingRef.current = false;
    prevLiveFiltersKeyRef.current = liveFiltersKey;
  }

  const onTransactionClick = useCallback(
    (item: TransactionGroup) => {
      const resolvedTransactionType = item.transactionType || transactionType;
      // Fetchers in the transaction detail flyout require a truthy transactionType;
      // opening without one leaves sections stuck on NOT_INITIATED / skeletons.
      if (!resolvedTransactionType) {
        return;
      }
      setSelectedTransaction((prev) => {
        if (
          prev?.transactionName === item.name &&
          prev.transactionType === resolvedTransactionType
        ) {
          return null;
        }
        pendingFilterReconcileRef.current = false;
        seenLoadingSincePendingRef.current = false;
        prevLiveFiltersKeyRef.current = liveFiltersKey;
        return {
          transactionName: item.name,
          transactionType: resolvedTransactionType,
          filters: liveTransactionFilters,
          isFiltersStale: false,
        };
      });
    },
    [transactionType, liveTransactionFilters, liveFiltersKey]
  );

  const onTransactionsChange = useCallback(
    (items: TransactionGroup[], { isLoading }: { isLoading: boolean }) => {
      setSelectedTransaction((prev) => {
        if (!prev) {
          return prev;
        }

        if (pendingFilterReconcileRef.current) {
          if (isLoading) {
            seenLoadingSincePendingRef.current = true;
            return prev;
          }
          // Ignore settles that arrive before a loading cycle for the new filters
          // (previous list still on screen with loading=false for one paint).
          if (!seenLoadingSincePendingRef.current) {
            return prev;
          }
          pendingFilterReconcileRef.current = false;
        } else if (isLoading) {
          return prev;
        }

        const isPresent = items.some((item) => {
          const resolvedType = item.transactionType || transactionType;
          return item.name === prev.transactionName && resolvedType === prev.transactionType;
        });

        if (isPresent) {
          if (!prev.isFiltersStale && isSameAppliedFilters(prev.filters, liveTransactionFilters)) {
            return prev;
          }
          return {
            ...prev,
            filters: liveTransactionFilters,
            isFiltersStale: false,
          };
        }

        // Missing under the current live filters. Ignore when applied filters already match
        // live (e.g. table search hid the row) so we don't falsely freeze.
        if (isSameAppliedFilters(prev.filters, liveTransactionFilters) || prev.isFiltersStale) {
          return prev;
        }

        return {
          ...prev,
          isFiltersStale: true,
        };
      });
    },
    [liveTransactionFilters, transactionType]
  );

  const isTransactionExpanded = useCallback(
    (item: TransactionGroup) => {
      if (!selectedTransaction) {
        return false;
      }
      const resolvedTransactionType = item.transactionType || transactionType;
      return (
        selectedTransaction.transactionName === item.name &&
        selectedTransaction.transactionType === resolvedTransactionType
      );
    },
    [selectedTransaction, transactionType]
  );
  // ES|QL charts over raw documents for: unprocessed OTel services (invisible to
  // the APM chart APIs) and document-based hosts like Discover (whose surrounding
  // RED charts read the raw documents). Every other case renders the same APM
  // chart components as the alert details page.
  const useEsqlKeyMetrics = Boolean(preferDocumentBasedCharts) || capabilities.schema === 'otel';

  const esqlKeyMetrics = useMemo(
    () =>
      useEsqlKeyMetrics
        ? getEsqlKeyMetricCharts({
            indices: indices ?? undefined,
            schema: capabilities.schema,
            serviceName: service.name,
            environment,
            transactionType: transactionType ?? '',
            latencyAggregationType,
            latencyTitleAction: (
              <LatencyAggregationTypeSelect
                latencyAggregationType={latencyAggregationType}
                onChange={setLatencyAggregationType}
                ebt={{ element: SERVICE_FLYOUT_EBT_ELEMENTS.CHART_CONTROLS }}
              />
            ),
            projectRouting,
          })
        : [],
    [
      useEsqlKeyMetrics,
      capabilities.schema,
      environment,
      indices,
      latencyAggregationType,
      service.name,
      transactionType,
      projectRouting,
    ]
  );

  const infrastructureMetrics = useMemo(
    () =>
      getInfrastructureMetricCharts({
        indices: indices ?? undefined,
        serviceName: service.name,
        environment,
        projectRouting,
      }),
    [environment, indices, service.name, projectRouting]
  );

  if (capabilities.loading) {
    return (
      <div data-test-subj="serviceFlyoutOverviewSkeleton">
        <EuiSkeletonTitle size="xs" />
        <EuiSpacer size="s" />
        <EuiSkeletonText lines={3} />
        <EuiSpacer size="m" />
        <EuiSkeletonTitle size="xs" />
        <EuiSpacer size="s" />
        <EuiSkeletonText lines={3} />
      </div>
    );
  }

  return (
    <div data-test-subj="serviceFlyoutOverview">
      <ServiceFlyoutQueryControls />
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" responsive={false} gutterSize="m">
        <EuiFlexItem>
          {useEsqlKeyMetrics ? (
            <ServiceFlyoutChartsSection
              id="keyMetrics"
              title={KEY_METRICS_SECTION_TITLE}
              charts={esqlKeyMetrics}
              isLoading={indices === undefined}
              hasError={indices === null}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              refreshToken={refreshToken}
            />
          ) : (
            <>
              <ServiceFlyoutSectionTitle id="keyMetrics" title={KEY_METRICS_SECTION_TITLE} />
              <ServiceFlyoutApmCharts
                key={refreshToken}
                latencyAggregationType={latencyAggregationType}
                setLatencyAggregationType={setLatencyAggregationType}
              />
            </>
          )}
        </EuiFlexItem>
        {capabilities.overview?.infraMetrics &&
          (isSystemMetricsLoading ? (
            <EuiFlexItem data-test-subj="serviceFlyoutSection-infrastructureMetricsSkeleton">
              <EuiSkeletonTitle size="xs" />
              <EuiSpacer size="s" />
              <EuiSkeletonText lines={2} />
            </EuiFlexItem>
          ) : hasSystemMetrics ? (
            <EuiFlexItem>
              <ServiceFlyoutChartsSection
                id="infrastructureMetrics"
                title={INFRASTRUCTURE_METRICS_SECTION_TITLE}
                description={INFRASTRUCTURE_METRICS_SECTION_DESCRIPTION}
                charts={infrastructureMetrics}
                isLoading={indices === undefined}
                hasError={indices === null}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                refreshToken={refreshToken}
              />
            </EuiFlexItem>
          ) : null)}
        {capabilities.overview?.transactions && (
          <EuiFlexItem data-test-subj="serviceFlyoutSection-transactions">
            <ServiceFlyoutTransactionsSection
              docLinks={core.docLinks}
              http={core.http}
              notifications={core.notifications}
              locators={share.url.locators}
              serviceName={service.name}
              environment={environment}
              start={start}
              end={end}
              transactionType={transactionType ?? ''}
              latencyAggregationType={latencyAggregationType}
              refreshToken={refreshToken}
              onTransactionClick={onTransactionClick}
              isTransactionExpanded={isTransactionExpanded}
              onTransactionsChange={onTransactionsChange}
              projectRouting={projectRouting}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {selectedTransaction && (
        <TransactionDetailFlyout
          deps={{ core, share, lens, dataViews }}
          contextActions={contextActions}
          filters={{
            serviceName: service.name,
            transactionName: selectedTransaction.transactionName,
            // Selection type for child fetches — not the parent type filter snapshot.
            transactionType: selectedTransaction.transactionType,
            environment: selectedTransaction.filters.environment,
            rangeFrom: selectedTransaction.filters.rangeFrom,
            rangeTo: selectedTransaction.filters.rangeTo,
            start: selectedTransaction.filters.start,
            end: selectedTransaction.filters.end,
          }}
          isFiltersStale={selectedTransaction.isFiltersStale}
          onClose={() => setSelectedTransaction(null)}
          historyKey={flyoutHistoryKey}
          preferDocumentBasedCharts={preferDocumentBasedCharts}
          schema={capabilities.schema}
          indices={indices}
        />
      )}
    </div>
  );
}
