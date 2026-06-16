/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { useKibanaQuerySettings } from '@kbn/observability-shared-plugin/public';
import type { ServiceMapOrientation } from '../../components/app/service_map/service_map_options_panel';
import type { ServiceMapViewFilters } from '../../components/app/service_map/apply_service_map_visibility';
import { useAdHocApmDataView } from '../../hooks/use_adhoc_apm_data_view';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getDateRange } from '../../context/url_params_context/helpers';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { invalidLicenseMessage, SERVICE_MAP_TIMEOUT_ERROR } from '../../../common/service_map';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import { useLicenseContext } from '../../context/license/use_license_context';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { EmptyPrompt } from '../../components/app/service_map/empty_prompt';
import { TimeoutPrompt } from '../../components/app/service_map/timeout_prompt';
import { useServiceMap } from '../../components/app/service_map/use_service_map';
import { useServiceMapBadges } from '../../components/app/service_map/use_service_map_badges';
import { ServiceMapGraph } from '../../components/app/service_map/graph';
import { ServiceMapSloFlyoutProvider } from '../../components/shared/service_map/service_map_slo_flyout_context';
import {
  SloOverviewFlyout,
  useSloOverviewFlyout,
} from '../../components/shared/slo_overview_flyout';
import { getServiceMapUrl } from './get_service_map_url';
import type { Environment } from '../../../common/environment_rt';

const EMBEDDABLE_MIN_HEIGHT = 400;
const EMBEDDABLE_MIN_WIDTH = 600;

export interface ServiceMapEmbeddableProps {
  rangeFrom: string;
  rangeTo: string;
  environment?: Environment;
  kuery?: string;
  serviceName?: string;
  serviceGroupId?: string;
  core: CoreStart;
  onBlockingError?: (error: Error | undefined) => void;
  /** Separate range for the badges query. Defaults to `[rangeFrom, rangeTo]`. */
  badgesRangeFrom?: string;
  badgesRangeTo?: string;
  /** KQL for the badges query only. Defaults to `kuery`. Pass `""` to aggregate across all nodes. */
  badgesKuery?: string;
  /** Show the popover's "Focus map" button in embedded contexts. Defaults to `!isEmbedded`. */
  showFocusMapInPopover?: boolean;
  /** Strip `kuery` from popover-built URLs ("Service Details" / "Focus map"); env still flows through. */
  clearKueryOnPopoverNavigation?: boolean;
  /** Focus button always navigates to standalone APM, even for the currently focused service. */
  alwaysNavigateOnPopoverFocus?: boolean;
  /** Drop cross-env spans before rendering when env is set. */
  strictEnvironmentScope?: boolean;
  /** Fires when the topology is definitively empty (`SUCCESS && nodes.length === 0`). */
  onEmptyStateChange?: (isEmpty: boolean) => void;
  /** Field-value pairs to pass as filter bar pills in the "View full map" link instead of kuery. */
  filterPills?: Array<{ field: string; value: string }>;
  /** Initial layout orientation; if `onMapOrientationChange` is also provided, becomes controlled. */
  mapOrientation?: ServiceMapOrientation;
  /** Called when the user (or the host) changes orientation. */
  onMapOrientationChange?: (next: ServiceMapOrientation) => void;
  /** Parent dashboard filters when the panel opts in to sync. Excludes `service.environment` (handled server-side). */
  parentFilters?: Filter[];
  /** Parent dashboard query when the panel opts in to sync. */
  parentQuery?: Query | AggregateQuery;
  /** Persisted view filters (alerts / SLOs / connection / anomaly severity) captured at "Copy to dashboard" time. */
  viewFilters?: ServiceMapViewFilters;
  /** Push in-panel filter edits back to the state manager so the embeddable's controlled value updates. */
  onViewFiltersChange?: (next: ServiceMapViewFilters) => void;
}

function LoadingSpinner() {
  return (
    <EuiLoadingSpinner
      size="xl"
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    />
  );
}

export function ServiceMapEmbeddable({
  rangeFrom,
  rangeTo,
  environment = ENVIRONMENT_ALL.value,
  kuery = '',
  serviceName,
  serviceGroupId,
  core,
  onBlockingError,
  badgesRangeFrom,
  badgesRangeTo,
  badgesKuery,
  showFocusMapInPopover,
  clearKueryOnPopoverNavigation,
  alwaysNavigateOnPopoverFocus,
  strictEnvironmentScope,
  onEmptyStateChange,
  filterPills,
  mapOrientation,
  onMapOrientationChange,
  parentFilters,
  parentQuery,
  viewFilters,
  onViewFiltersChange,
}: ServiceMapEmbeddableProps) {
  const license = useLicenseContext();
  const { config } = useApmPluginContext();

  const hasValidLicense = license && isActivePlatinumLicense(license);
  const isServiceMapEnabled = config.serviceMapEnabled;

  useEffect(() => {
    if (license && !hasValidLicense) {
      onBlockingError?.(new Error(invalidLicenseMessage));
    } else if (!isServiceMapEnabled) {
      onBlockingError?.(
        new Error(
          i18n.translate('xpack.apm.serviceMapEmbeddable.disabledError', {
            defaultMessage: 'Service map is disabled in APM configuration',
          })
        )
      );
    } else {
      onBlockingError?.(undefined);
    }
  }, [license, hasValidLicense, isServiceMapEnabled, onBlockingError]);

  const { start, end } = useMemo(() => {
    const { start: parsedStart, end: parsedEnd } = getDateRange({ rangeFrom, rangeTo });
    return { start: parsedStart ?? rangeFrom, end: parsedEnd ?? rangeTo };
  }, [rangeFrom, rangeTo]);

  const { start: badgesStart, end: badgesEnd } = useMemo(() => {
    if (badgesRangeFrom == null || badgesRangeTo == null) {
      return { start, end };
    }
    const { start: parsedStart, end: parsedEnd } = getDateRange({
      rangeFrom: badgesRangeFrom,
      rangeTo: badgesRangeTo,
    });
    return { start: parsedStart ?? badgesRangeFrom, end: parsedEnd ?? badgesRangeTo };
  }, [badgesRangeFrom, badgesRangeTo, start, end]);

  const { sloOverviewFlyout, openSloOverviewFlyout, closeSloOverviewFlyout } =
    useSloOverviewFlyout();

  // Build an ES query from dashboard-level filters/query when the panel opts in to
  // sync_with_dashboard_filters. Environment is excluded — it's still passed via the
  // dedicated server param, mirroring service_map_search_bar.tsx.
  const { dataView } = useAdHocApmDataView();
  const kibanaQuerySettings = useKibanaQuerySettings();
  const esQuery = useMemo(() => {
    // Environment is applied via the dedicated server param, so it never contributes to the
    // dashboard-derived es-query.
    const filtersWithoutEnv = (parentFilters ?? []).filter(
      (f) => f.meta?.key !== 'service.environment'
    );
    const hasParentFilters = filtersWithoutEnv.length > 0;
    // Only treat the parent query as present when it's an actual non-empty KQL/Lucene string.
    // Feeding an empty string (or a query object with no string) into buildEsQuery would match
    // everything and over-broaden the panel's results (review #17).
    const parentQueryText =
      parentQuery && 'query' in parentQuery && typeof parentQuery.query === 'string'
        ? parentQuery.query.trim()
        : '';
    const hasParentQuery = parentQueryText.length > 0;
    if (!dataView || (!hasParentFilters && !hasParentQuery)) {
      return undefined;
    }
    const parentQueryLanguage =
      parentQuery && 'language' in parentQuery && typeof parentQuery.language === 'string'
        ? parentQuery.language
        : 'kuery';
    const queries: Query[] = hasParentQuery
      ? [{ query: parentQueryText, language: parentQueryLanguage }]
      : [];
    return buildEsQuery(dataView, queries, filtersWithoutEnv, kibanaQuerySettings);
  }, [dataView, parentFilters, parentQuery, kibanaQuerySettings]);

  const { data, status, error } = useServiceMap({
    environment,
    kuery,
    start,
    end,
    serviceGroupId,
    serviceName,
    strictEnvironmentScope,
    esQuery,
  });

  // Only fire on SUCCESS — loading/error states carry no emptiness signal.
  useEffect(() => {
    if (!onEmptyStateChange) return;
    if (status !== FETCH_STATUS.SUCCESS) return;
    onEmptyStateChange(data.nodes.length === 0);
  }, [onEmptyStateChange, status, data.nodes.length]);

  const { nodes: nodesForGraph, status: badgesStatus } = useServiceMapBadges({
    environment,
    start: badgesStart,
    end: badgesEnd,
    kuery: badgesKuery ?? kuery,
    nodes: data.nodes,
    nodesStatus: status,
  });

  // The alert / SLO / anomaly-severity filters depend on badge data (node fields like
  // `alertsCount` / `sloStatus`). Until badges resolve we strip those filters; the connection
  // filter stays since it only needs topology. Loading is covered by `isLoading` below (spinner,
  // not a stripped map), so there's no flash. On a badges *failure* we keep showing all services
  // (fail open) but surface a warning so the user knows those filters couldn't be applied
  // (review #7) — silently dropping them looked like the filters were ignored.
  const viewFiltersForGraph = useMemo<ServiceMapViewFilters | undefined>(() => {
    if (!viewFilters) return viewFilters;
    if (badgesStatus === FETCH_STATUS.SUCCESS) return viewFilters;
    return {
      ...viewFilters,
      alertStatusFilter: [],
      sloStatusFilter: [],
      anomalySeverityFilter: [],
    };
  }, [viewFilters, badgesStatus]);

  const badgeDependentFiltersActive =
    (viewFilters?.alertStatusFilter?.length ?? 0) > 0 ||
    (viewFilters?.sloStatusFilter?.length ?? 0) > 0 ||
    (viewFilters?.anomalySeverityFilter?.length ?? 0) > 0;
  const showBadgesFailedWarning =
    badgeDependentFiltersActive && badgesStatus === FETCH_STATUS.FAILURE;

  if (!license || !isActivePlatinumLicense(license) || !config.serviceMapEnabled) {
    return (
      <div
        data-test-subj="apmServiceMapEmbeddable"
        style={{
          width: '100%',
          height: '100%',
          minWidth: EMBEDDABLE_MIN_WIDTH,
          minHeight: EMBEDDABLE_MIN_HEIGHT,
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        <LoadingSpinner />
      </div>
    );
  }

  const isEmpty = data.nodes.length === 0;
  if (status === FETCH_STATUS.SUCCESS && isEmpty) {
    // Host owns the empty UI; skip the prompt to avoid a one-frame flash before unmount.
    if (onEmptyStateChange) {
      return null;
    }
    return (
      <div data-test-subj="apmServiceMapEmbeddable">
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <EmptyPrompt />
        </EuiPanel>
      </div>
    );
  }

  if (
    status === FETCH_STATUS.FAILURE &&
    error &&
    'body' in error &&
    error.body?.statusCode === 500 &&
    error.body?.message === SERVICE_MAP_TIMEOUT_ERROR
  ) {
    return (
      <div data-test-subj="apmServiceMapEmbeddable">
        <EuiPanel hasBorder paddingSize="l">
          <TimeoutPrompt isGlobalServiceMap={!serviceName} />
        </EuiPanel>
      </div>
    );
  }

  if (status === FETCH_STATUS.FAILURE) {
    return (
      <div data-test-subj="apmServiceMapEmbeddable">
        <EuiPanel hasBorder paddingSize="l">
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            title={i18n.translate('xpack.apm.serviceMapEmbeddable.errorTitle', {
              defaultMessage: 'Unable to load service map',
            })}
            data-test-subj="apmServiceMapEmbeddableError"
          >
            <p>
              {i18n.translate('xpack.apm.serviceMapEmbeddable.errorDescription', {
                defaultMessage:
                  'There was a problem loading the service map. Try refreshing the view.',
              })}
            </p>
          </EuiCallOut>
        </EuiPanel>
      </div>
    );
  }

  const fullMapHref = getServiceMapUrl(core, {
    rangeFrom,
    rangeTo,
    environment,
    serviceName,
    serviceGroupId,
    filterPills,
  });

  const isLoading = status === FETCH_STATUS.LOADING || badgesStatus === FETCH_STATUS.LOADING;

  return (
    <ServiceMapSloFlyoutProvider onSloBadgeClick={openSloOverviewFlyout}>
      <div
        data-test-subj="apmServiceMapEmbeddable"
        style={{
          width: '100%',
          height: '100%',
          minWidth: EMBEDDABLE_MIN_WIDTH,
          minHeight: EMBEDDABLE_MIN_HEIGHT,
          position: 'relative' as const,
          boxSizing: 'border-box',
        }}
      >
        {isLoading && <LoadingSpinner />}
        {showBadgesFailedWarning && (
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            title={i18n.translate('xpack.apm.serviceMapEmbeddable.badgesFailedWarning', {
              defaultMessage:
                "Alert, SLO and anomaly filters couldn't be applied because their data failed to load. Showing all services.",
            })}
            data-test-subj="apmServiceMapEmbeddableBadgesFailedWarning"
            css={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }}
          />
        )}
        <ServiceMapGraph
          height="100%"
          nodes={isLoading ? [] : nodesForGraph}
          edges={isLoading ? [] : data.edges}
          serviceName={serviceName}
          highlightedServiceName={serviceName}
          environment={environment}
          kuery={kuery}
          start={start}
          end={end}
          isFullscreen={false}
          fullMapHref={fullMapHref}
          isEmbedded
          showFocusMap={showFocusMapInPopover}
          alwaysNavigateOnPopoverFocus={alwaysNavigateOnPopoverFocus}
          clearKueryOnPopoverNavigation={clearKueryOnPopoverNavigation}
          mapOrientation={mapOrientation}
          onMapOrientationChange={onMapOrientationChange}
          viewFilters={viewFiltersForGraph}
          onViewFiltersChange={onViewFiltersChange}
        />
      </div>
      {sloOverviewFlyout && (
        <SloOverviewFlyout
          serviceName={sloOverviewFlyout.serviceName}
          agentName={sloOverviewFlyout.agentName}
          onClose={closeSloOverviewFlyout}
        />
      )}
    </ServiceMapSloFlyoutProvider>
  );
}
