/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import type { Environment } from '../../../../common/environment_rt';
import { useTimeRange } from '../../../hooks/use_time_range';
import { TimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { ResponsiveFlyout } from '../responsive_flyout';
import { ServiceFlyoutFooter } from './footer';
import { ServiceFlyoutHeader } from './header';
import { ServiceFlyoutOverview } from './overview';
import {
  ServiceFlyoutContextProvider,
  type ServiceFlyoutContextValue,
} from './service_flyout_context';
import { useServiceFlyoutCapabilities } from './hooks/use_service_flyout_capabilities';
import { useApmIndices } from './hooks/use_apm_indices';
export type { ServiceFlyoutService } from './types';

/**
 * APM service overview timeseries chart ids for which the elastic-charts tooltip
 * portal should be kept below the service flyout.
 * See: https://github.com/elastic/kibana/issues/286822
 *
 * Each id matches `<Chart id={...}>` in the owning component, which also renders
 * the same string as `data-test-subj` via ChartContainer — so a rename breaks
 * those tests and won't silently break this CSS.
 *
 * Lens mounts a global `[id^='echTooltipPortal'] { z-index: levels.flyout + 1 !important }`
 * rule whenever any Lens embeddable is on the page (lens/expression_renderer_styles.tsx,
 * PR #280957). The `body ` prefix gives this rule higher specificity (0,2,0 vs 0,1,0) so
 * it wins regardless of emotion insertion order.
 */
const SERVICE_OVERVIEW_CHART_IDS = [
  'latencyChart', // shared/charts/latency_chart/index.tsx
  'throughput', // app/service_overview/service_overview_throughput_chart/index.tsx
  'errorRate', // shared/charts/failed_transaction_rate_chart/index.tsx
  'transactionBreakdownChart', // shared/charts/transaction_breakdown_chart/index.tsx
  'coldstartRate', // shared/charts/transaction_coldstart_rate_chart/index.tsx
] as const;

const SERVICE_OVERVIEW_CHART_TOOLTIP_SELECTORS = SERVICE_OVERVIEW_CHART_IDS.map(
  (id) => `body [id^='echTooltipPortalMainTooltip__${id}']`
).join(',\n  ');

export const SERVICE_FLYOUT_TAB_IDS = {
  overview: 'overview',
  alerts: 'alerts',
  slos: 'slos',
} as const;

export type ServiceFlyoutTabId =
  (typeof SERVICE_FLYOUT_TAB_IDS)[keyof typeof SERVICE_FLYOUT_TAB_IDS];

export const SERVICE_FLYOUT_DEFAULT_TAB_ID = SERVICE_FLYOUT_TAB_IDS.overview;

export const SERVICE_FLYOUT_TABS = [
  {
    id: SERVICE_FLYOUT_TAB_IDS.overview,
    label: i18n.translate('xpack.apm.serviceFlyout.overviewTabLabel', {
      defaultMessage: 'Overview',
    }),
  },
] as const;

export interface ServiceFlyoutTelemetry {
  client: { reportServiceFlyoutViewed: (params: { tabId: string; source: string }) => void };
  source: string;
}

interface ServiceFlyoutProps {
  deps: ServiceFlyoutContextValue['deps'];
  service: ServiceFlyoutContextValue['service'];
  filters: {
    environment: Environment;
    rangeFrom: string;
    rangeTo: string;
    transactionType?: string;
  };
  telemetry: ServiceFlyoutTelemetry;
  onClose: () => void;
  historyKey?: symbol;
  contextActions?: ServiceFlyoutContextValue['contextActions'];
}

export function ServiceFlyout({
  deps,
  service,
  filters,
  telemetry,
  onClose,
  historyKey,
  contextActions,
}: ServiceFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const { environment, rangeFrom, rangeTo, transactionType } = filters;
  const title = service.name;
  const titleId = useGeneratedHtmlId({ prefix: 'serviceFlyoutTitle' });
  const [flyoutEnvironment, setFlyoutEnvironment] = useState(environment);
  const [flyoutRange, setFlyoutRange] = useState({ rangeFrom, rangeTo });
  const { start, end } = useTimeRange({
    rangeFrom: flyoutRange.rangeFrom,
    rangeTo: flyoutRange.rangeTo,
  });
  const [flyoutTransactionType, setFlyoutTransactionType] = useState(transactionType ?? '');
  const [refreshToken, setRefreshToken] = useState(Date.now());

  const capabilities = useServiceFlyoutCapabilities({
    serviceName: service.name,
    environment: flyoutEnvironment,
    start,
    end,
  });

  const { indices: indicesValue, loading: indicesLoading } = useApmIndices({
    http: deps.core.http,
  });
  const indices = indicesLoading ? undefined : indicesValue ?? null;

  const [selectedTabId, setSelectedTabId] = useState<ServiceFlyoutTabId>(
    SERVICE_FLYOUT_DEFAULT_TAB_ID
  );

  const { client: telemetryClient, source: telemetrySource } = telemetry;
  useEffect(() => {
    telemetryClient.reportServiceFlyoutViewed({ tabId: selectedTabId, source: telemetrySource });
  }, [telemetryClient, telemetrySource, selectedTabId]);

  const renderTabContent = () => {
    switch (selectedTabId) {
      case SERVICE_FLYOUT_TAB_IDS.overview:
        return <ServiceFlyoutOverview />;
      default:
        return null;
    }
  };

  return (
    <>
      {/*
       * While the flyout is open, pin the service overview chart tooltip portals below
       * flyout level. Lens mounts a global `[id^='echTooltipPortal'] { z-index: 1001 !important }`
       * rule for every Lens embeddable (PR #280957) — the flyout's own charts are Lens
       * embeddables, so opening it drags the page's native chart tooltips from 100 to 1001,
       * just above the flyout's 1000. The `body` prefix (specificity 0,2,0) beats Lens's
       * single-attribute selector (0,1,0) regardless of emotion insertion order.
       * https://github.com/elastic/kibana/issues/286822
       */}
      <Global
        styles={css`
          ${SERVICE_OVERVIEW_CHART_TOOLTIP_SELECTORS} {
            z-index: ${Number(euiTheme.levels.flyout) - 1} !important;
          }
        `}
      />
      <ServiceFlyoutContextProvider
        value={{
          deps,
          contextActions,
          service,
          capabilities,
          indices,
          filters: {
            environment: flyoutEnvironment,
            setEnvironment: setFlyoutEnvironment,
            rangeFrom: flyoutRange.rangeFrom,
            rangeTo: flyoutRange.rangeTo,
            setRange: setFlyoutRange,
            refreshToken,
            onRefresh: () => setRefreshToken(Date.now()),
            transactionType: flyoutTransactionType,
            setTransactionType: setFlyoutTransactionType,
          },
        }}
      >
        <TimeRangeMetadataContextProvider
          uiSettings={deps.core.uiSettings}
          start={start}
          end={end}
          kuery=""
          useSpanName={false}
        >
          <ResponsiveFlyout
            data-test-subj="serviceFlyout"
            flyoutMenuDisplayMode="always"
            onClose={onClose}
            ownFocus={false}
            size="m"
            paddingSize="m"
            resizable
            minWidth={660}
            session="start"
            historyKey={historyKey}
            flyoutMenuProps={{ title }}
            aria-labelledby={titleId}
          >
            <ServiceFlyoutHeader
              title={title}
              titleId={titleId}
              selectedTabId={selectedTabId}
              onSelectedTabIdChange={setSelectedTabId}
            />
            <EuiFlyoutBody>{renderTabContent()}</EuiFlyoutBody>
            <ServiceFlyoutFooter />
          </ResponsiveFlyout>
        </TimeRangeMetadataContextProvider>
      </ServiceFlyoutContextProvider>
    </>
  );
}
