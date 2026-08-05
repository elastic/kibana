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
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ServiceFlyoutTransactionsSection } from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import type { LensESQLConfig } from './types';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { useServiceFlyoutContext } from '../service_flyout_context';
import { useAdHocApmDataView } from '../../../../hooks/use_adhoc_apm_data_view';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { LatencyAggregationTypeSelect } from '../../charts/latency_chart/latency_aggregation_type_select';
import { useServiceHasSystemMetrics } from '../hooks/use_service_has_system_metrics';
import { getChartDefinitions } from './chart_configs';
import { ServiceFlyoutLensChart } from './lens_chart';
import { ServiceFlyoutQueryControls } from './query_controls';

const KEY_METRICS_SECTION_TITLE = i18n.translate('xpack.apm.serviceFlyout.keyMetricsSectionTitle', {
  defaultMessage: 'Key metrics',
});

const INFRASTRUCTURE_METRICS_SECTION_TITLE = i18n.translate(
  'xpack.apm.serviceFlyout.infrastructureMetricsSectionTitle',
  { defaultMessage: 'Infrastructure metrics' }
);

const INFRASTRUCTURE_METRICS_SECTION_DESCRIPTION = i18n.translate(
  'xpack.apm.serviceFlyout.infrastructureMetricsSectionTooltip',
  {
    defaultMessage:
      'Infrastructure metrics reflect system-level data and are not filtered by transaction type.',
  }
);

interface FlyoutLensChartDefinition {
  id: string;
  title: string;
  titleAction?: React.ReactNode;
  config?: LensESQLConfig;
}

function ServiceFlyoutChartsSection({
  id,
  title,
  description,
  charts,
  rangeFrom,
  rangeTo,
  refreshToken,
}: {
  id: string;
  title: string;
  description?: string;
  charts: FlyoutLensChartDefinition[];
  rangeFrom: string;
  rangeTo: string;
  refreshToken: number;
}) {
  const { euiTheme } = useEuiTheme();

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
        {description ? (
          <EuiFlexItem grow={false}>
            <EuiIconTip content={description} size="s" color="subdued" aria-label={description} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
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
    </>
  );
}

export function ServiceFlyoutOverview() {
  const [latencyAggregationType, setLatencyAggregationType] = useState(LatencyAggregationType.avg);
  const {
    deps: { core, share },
    service,
    filters: { environment, rangeFrom, rangeTo, transactionType, refreshToken },
  } = useServiceFlyoutContext();
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { dataView } = useAdHocApmDataView();
  const indexes = dataView?.getIndexPattern();
  const { hasSystemMetrics, isLoading: isSystemMetricsLoading } = useServiceHasSystemMetrics({
    serviceName: service.name,
    environment,
    rangeFrom,
    rangeTo,
  });

  const { keyMetrics, infrastructureMetrics } = useMemo(
    () =>
      getChartDefinitions({
        indexes,
        serviceName: service.name,
        environment,
        transactionType: transactionType ?? '',
        latencyAggregationType,
        latencyTitleAction: (
          <LatencyAggregationTypeSelect
            latencyAggregationType={latencyAggregationType}
            onChange={setLatencyAggregationType}
          />
        ),
      }),
    [environment, indexes, latencyAggregationType, service.name, transactionType]
  );

  return (
    <div data-test-subj="serviceFlyoutOverview">
      <ServiceFlyoutQueryControls />
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" responsive={false} gutterSize="m">
        <EuiFlexItem>
          <ServiceFlyoutChartsSection
            id="keyMetrics"
            title={KEY_METRICS_SECTION_TITLE}
            charts={keyMetrics}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            refreshToken={refreshToken}
          />
        </EuiFlexItem>
        {isSystemMetricsLoading ? (
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
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              refreshToken={refreshToken}
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <ServiceFlyoutTransactionsSection
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
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
