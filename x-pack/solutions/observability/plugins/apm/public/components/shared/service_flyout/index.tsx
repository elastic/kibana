/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
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

const SERVICE_OVERVIEW_CHART_TOOLTIP_SELECTORS = [
  'latencyChart',
  'throughput',
  'errorRate',
  'transactionBreakdownChart',
  'coldstartRate',
]
  .map((id) => `body [id^='echTooltipPortalMainTooltip__${id}']`)
  .join(',\n  ');

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

  // One history key per flyout instance groups nested flyouts (transaction detail,
  // full trace) into the same EUI back-button stack — same pattern as Discover.
  const flyoutHistoryKey = useMemo(() => historyKey ?? Symbol('apmServiceFlyout'), [historyKey]);

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
          flyoutHistoryKey,
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
            // No resizable — pixel-locked width re-clamps under a nested session="start".
            minWidth={660}
            session="start"
            historyKey={flyoutHistoryKey}
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
