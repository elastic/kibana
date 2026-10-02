/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { Global, css } from '@emotion/react';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Environment } from '../../../../common/environment_rt';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { useTimeRange } from '../../../hooks/use_time_range';
import { TimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { SERVICE_FLYOUT_EBT_ACTIONS, SERVICE_FLYOUT_EBT_ELEMENTS } from './ebt_constants';
import { useServiceBadges } from './header/service_badges';
import { useServiceFlyoutTitle } from './header';
import { useServiceFlyoutFooterMenu } from './footer';
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

// The flyout's own chart tooltips must render above the flyout. Elastic Charts
// derives the portal z-index from the chart's ancestors, which breaks when the
// flyout is stacked over another flyout (e.g. Discover's doc viewer) — the
// portal ends up below the flyout and the tooltip is invisible.
const SERVICE_FLYOUT_OWN_CHART_TOOLTIP_SELECTOR =
  "body [id^='echTooltipPortalMainTooltip__serviceFlyout']";

export const SERVICE_FLYOUT_TAB_IDS = {
  overview: 'overview',
} as const;

export const SERVICE_FLYOUT_TABS = [
  {
    id: SERVICE_FLYOUT_TAB_IDS.overview,
    label: i18n.translate('xpack.apm.serviceFlyout.overviewTabLabel', {
      defaultMessage: 'Overview',
    }),
  },
] as const;

/**
 * Derived from the declared tabs so the selected-tab state cannot hold an id that has no tab to
 * render it, which is also what the flyout reports to telemetry.
 */
export type ServiceFlyoutTabId = (typeof SERVICE_FLYOUT_TABS)[number]['id'];

export const SERVICE_FLYOUT_DEFAULT_TAB_ID = SERVICE_FLYOUT_TAB_IDS.overview;

/** `FlyoutTemplate` hands back an unconstrained `string`, so narrow it to a declared tab. */
const isServiceFlyoutTabId = (id: string): id is ServiceFlyoutTabId =>
  SERVICE_FLYOUT_TABS.some((tab) => tab.id === id);

const ACTIONS_BUTTON_LABEL = i18n.translate('xpack.apm.serviceFlyout.actionsButtonLabel', {
  defaultMessage: 'Actions',
});

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
    /** Initial latency aggregation type, e.g. inherited from a rule or the host page. */
    latencyAggregationType?: LatencyAggregationType;
  };
  telemetry: ServiceFlyoutTelemetry;
  onClose: () => void;
  historyKey?: symbol;
  contextActions?: ServiceFlyoutContextValue['contextActions'];
  /**
   * Set by hosts whose surrounding UI is computed from raw documents (Discover):
   * the key metric charts then stay ES|QL over raw documents for every schema,
   * so they agree with the host instead of the rollup-based APM chart APIs.
   */
  preferDocumentBasedCharts?: boolean;
}

interface ServiceFlyoutContentProps {
  title: string;
  onClose: () => void;
  flyoutHistoryKey: symbol;
  selectedTabId: ServiceFlyoutTabId;
  onSelectedTabIdChange: (tabId: ServiceFlyoutTabId) => void;
}

/**
 * Authors the `FlyoutTemplate` tree. Rendered inside the flyout's context providers so the header,
 * badge, and footer hooks have access; the template assembly requires the zones and their parts to
 * be direct children of `<FlyoutTemplate>`, so they are composed here rather than in sub-components.
 */
function ServiceFlyoutContent({
  title,
  onClose,
  flyoutHistoryKey,
  selectedTabId,
  onSelectedTabIdChange,
}: ServiceFlyoutContentProps) {
  const titleNode = useServiceFlyoutTitle(title);
  const badges = useServiceBadges();
  const { panels, isLoading, hasActions } = useServiceFlyoutFooterMenu();

  const handleTabChange = useCallback(
    (id: string) => {
      if (isServiceFlyoutTabId(id)) {
        onSelectedTabIdChange(id);
      }
    },
    [onSelectedTabIdChange]
  );

  const tabs = useMemo(
    () =>
      SERVICE_FLYOUT_TABS.map(({ id, label }) => ({
        id,
        label,
        'data-test-subj': `serviceFlyoutTab-${id}`,
        ...getEbtProps({
          action: SERVICE_FLYOUT_EBT_ACTIONS.VIEW_TAB,
          element: SERVICE_FLYOUT_EBT_ELEMENTS.TABS,
          detail: id,
        }),
      })),
    []
  );

  return (
    <FlyoutTemplate
      data-test-subj="serviceFlyout"
      onClose={onClose}
      ownFocus={false}
      size="m"
      // No resizable — pixel-locked width re-clamps under a nested session="start".
      minWidth={660}
      session="start"
      historyKey={flyoutHistoryKey}
      flyoutMenuProps={{ title }}
      tabs={tabs}
      tabBarProps={{ 'data-test-subj': 'serviceFlyoutTabs' }}
      selectedTabId={selectedTabId}
      onTabChange={handleTabChange}
    >
      <FlyoutTemplate.Header title={titleNode}>{badges}</FlyoutTemplate.Header>
      <FlyoutTemplate.Body>
        <FlyoutTemplate.Body.TabPanel tabId={SERVICE_FLYOUT_TAB_IDS.overview}>
          <ServiceFlyoutOverview />
        </FlyoutTemplate.Body.TabPanel>
      </FlyoutTemplate.Body>
      <FlyoutTemplate.Footer>
        <FlyoutTemplate.Footer.PrimaryActionMenu
          label={ACTIONS_BUTTON_LABEL}
          panels={panels}
          data-test-subj="serviceFlyoutActionsButton"
          isLoading={isLoading}
          isDisabled={isLoading || !hasActions}
          {...getEbtProps({
            action: EBT_CLICK_ACTIONS.OPEN_ACTIONS,
            element: SERVICE_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
          })}
        />
      </FlyoutTemplate.Footer>
    </FlyoutTemplate>
  );
}

export function ServiceFlyout({
  deps,
  service,
  filters,
  telemetry,
  onClose,
  historyKey,
  contextActions,
  preferDocumentBasedCharts,
}: ServiceFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const { environment, rangeFrom, rangeTo, transactionType } = filters;
  const { latencyAggregationType } = filters;
  const title = service.name;
  const [flyoutEnvironment, setFlyoutEnvironment] = useState(environment);
  const [flyoutRange, setFlyoutRange] = useState({ rangeFrom, rangeTo });
  const { start, end } = useTimeRange({
    rangeFrom: flyoutRange.rangeFrom,
    rangeTo: flyoutRange.rangeTo,
  });
  const [flyoutTransactionType, setFlyoutTransactionType] = useState(transactionType ?? '');
  const [refreshToken, setRefreshToken] = useState(Date.now());

  // Local only — do not call refreshTimeRange() (app-wide timeRangeId / unrelated page fetchers).
  const onRefresh = useCallback(() => {
    setRefreshToken(Date.now());
  }, []);

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

  return (
    <>
      <Global
        styles={css`
          ${preferDocumentBasedCharts
            ? // Document-based hosts (Discover) show the flyout's ES|QL Lens charts,
              // whose Elastic Charts ids are generated — they can't be targeted
              // individually, so raise all chart tooltips while the flyout is open.
              `body [id^='echTooltipPortalMainTooltip__'] {
                z-index: ${Number(euiTheme.levels.toast)} !important;
              }`
            : ''}
          ${SERVICE_OVERVIEW_CHART_TOOLTIP_SELECTORS} {
            z-index: ${Number(euiTheme.levels.flyout) - 1} !important;
          }
          ${SERVICE_FLYOUT_OWN_CHART_TOOLTIP_SELECTOR} {
            z-index: ${Number(euiTheme.levels.toast)} !important;
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
          preferDocumentBasedCharts,
          filters: {
            environment: flyoutEnvironment,
            setEnvironment: setFlyoutEnvironment,
            rangeFrom: flyoutRange.rangeFrom,
            rangeTo: flyoutRange.rangeTo,
            start,
            end,
            setRange: setFlyoutRange,
            refreshToken,
            onRefresh,
            transactionType: flyoutTransactionType,
            setTransactionType: setFlyoutTransactionType,
            latencyAggregationType,
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
          <ServiceFlyoutContent
            title={title}
            onClose={onClose}
            flyoutHistoryKey={flyoutHistoryKey}
            selectedTabId={selectedTabId}
            onSelectedTabIdChange={setSelectedTabId}
          />
        </TimeRangeMetadataContextProvider>
      </ServiceFlyoutContextProvider>
    </>
  );
}
