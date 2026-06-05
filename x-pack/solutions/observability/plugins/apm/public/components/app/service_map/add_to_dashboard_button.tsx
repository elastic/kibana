/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/serialize';
import { i18n } from '@kbn/i18n';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { Filter } from '@kbn/es-query';
import {
  escapeQuotes,
  getPhraseFilterValue,
  isExistsFilter,
  isPhraseFilter,
  isPhrasesFilter,
} from '@kbn/es-query';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { SavedObjectSaveModalDashboard } from '@kbn/presentation-util-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { encode as encodeRison } from '@kbn/rison';
import type { ApmPluginStartDeps, ApmServices } from '../../../plugin';
import { APM_SERVICE_MAP_EMBEDDABLE } from '../../../embeddable/service_map/constants';
import type { ServiceMapEmbeddableState } from '../../../../common/embeddable/service_map_embeddable_schema';
import type { Environment } from '../../../../common/environment_rt';
import type { ServiceMapOrientation } from './service_map_options_panel';
import type { ServiceMapViewFilters } from './apply_service_map_visibility';
import { readInitialAppStateFromRawUrl } from './use_filter_url_sync';

interface AddToDashboardButtonProps {
  environment: Environment;
  kuery: string;
  /** Resolved absolute start/end — fallback for the dashboard time seed. */
  start: string;
  end: string;
  /**
   * Raw URL range (may be relative, e.g. `now-15m` / `now`). Preferred for seeding the
   * destination dashboard's global time so a relative range stays live instead of being
   * frozen to the absolute timestamps it happened to resolve to at copy time.
   */
  rangeFrom?: string;
  rangeTo?: string;
  serviceName?: string;
  serviceGroupId?: string;
  mapOrientation: ServiceMapOrientation;
  viewFilters: ServiceMapViewFilters;
  /** Optional Emotion styles for the icon button; lets the toolbar enforce a consistent hit target. */
  controlIconCss?: SerializedStyles;
}

/** Serialize a single string value as a quoted KQL phrase, using es-query's canonical escaping. */
function quoteKqlValue(value: string): string {
  return `"${escapeQuotes(String(value))}"`;
}

/**
 * Build the hash path expected by the Dashboards app's incoming-embeddable handler.
 * Always seed the global time range (`_g.time`) from the APM view the user was looking
 * at — matches the Lens "Save and add to dashboard" UX so the destination dashboard's
 * time picker reflects the snapshot. Caveat: encoding `_g=(time:...)` replaces the
 * whole `_g` payload, so pinned filters / a non-default refresh interval on an existing
 * destination dashboard get dropped. Lens does the same; product direction is to match.
 */
function dashboardPathForId(
  dashboardId: string | null,
  timeRange?: { from: string; to: string }
): string {
  const isNew = !dashboardId || dashboardId === 'new';
  const base = isNew ? '#/create' : `#/view/${dashboardId}`;
  if (!timeRange) {
    return base;
  }
  const g = encodeRison({ time: { from: timeRange.from, to: timeRange.to } });
  return `${base}?_g=${g}`;
}

/**
 * Convert a phrase / phrases / exists filter (optionally negated) to a KQL fragment.
 * Range, custom and other complex filter shapes aren't representable as a simple KQL clause and
 * are intentionally dropped (review #5) — the service map only attaches the simple filters this
 * handles, so anything else returns `undefined` and is skipped.
 */
function filterToKql(filter: Filter): string | undefined {
  const field = filter.meta?.key;
  if (!field || filter.meta?.disabled) return undefined;
  const negate = filter.meta?.negate ? 'not ' : '';
  if (isPhraseFilter(filter)) {
    const value = getPhraseFilterValue(filter);
    if (value == null) return undefined;
    return `${negate}${field}: ${quoteKqlValue(String(value))}`;
  }
  if (isPhrasesFilter(filter)) {
    const params = filter.meta.params;
    if (!params || params.length === 0) return undefined;
    const values = params.map((v) => quoteKqlValue(String(v))).join(' or ');
    return `${negate}${field}: (${values})`;
  }
  if (isExistsFilter(filter)) {
    return `${negate}${field}: *`;
  }
  return undefined;
}

/** Convert a Record<field, values[]> control-selections map to KQL fragments. */
function controlSelectionsToKql(selections: Record<string, string[]>): string[] {
  return Object.entries(selections)
    .filter(([, values]) => values.length > 0)
    .map(([field, values]) =>
      values.length === 1
        ? `${field}: ${quoteKqlValue(values[0])}`
        : `${field}: (${values.map(quoteKqlValue).join(' or ')})`
    );
}

/**
 * Read the current page's filters from URL + filterManager and project them onto the
 * embeddable's schema fields:
 * - URL service name (from `/services/{name}/service-map`) → `service_name`
 * - Controls API single `service.name` selection → `service_name` (when no URL one)
 * - service.environment selection → ignored here (URL `?environment=` already captured)
 * - everything else (URL kuery, remaining Controls selections, pill filters) → KQL clauses appended to `kuery`
 *
 * Once a `service_name` is set (from the URL or a single Controls selection), every leftover
 * `service.name` selection/pill is dropped so the panel can't get two conflicting service
 * filters (review #6).
 *
 * Pure: all page/app state is passed in (the caller reads the URL once), which keeps it
 * unit-testable and the captured state aligned with what the caller saw on screen (review #4).
 */
function capturePageFilters({
  urlKuery,
  urlServiceName,
  filterManagerFilters,
  controlSelections,
}: {
  urlKuery: string;
  urlServiceName: string | undefined;
  filterManagerFilters: Filter[];
  controlSelections: Record<string, string[]>;
}): { kuery: string | undefined; service_name: string | undefined } {
  // Promote a single Controls API service.name selection to the dedicated field
  // when no URL service name is set. Multiple selections stay as a KQL clause.
  let serviceName = urlServiceName;
  const serviceNameSelection = controlSelections['service.name'];
  if (!serviceName && serviceNameSelection && serviceNameSelection.length === 1) {
    serviceName = serviceNameSelection[0];
  }

  // Build KQL fragments from remaining Controls selections. Drop env (dedicated URL param) and,
  // once a service name is set, drop any service.name selection (promoted to the dedicated field).
  const remainingSelections: Record<string, string[]> = { ...controlSelections };
  delete remainingSelections['service.environment'];
  if (serviceName) {
    delete remainingSelections['service.name'];
  }
  const controlsKql = controlSelectionsToKql(remainingSelections);

  // Build KQL fragments from filter-bar pills:
  // - skip env (dedicated URL param)
  // - skip every service.name pill once a service name is set (avoid duplicate / contradiction)
  const pillsKql = filterManagerFilters
    .filter((f) => {
      if (f.meta?.key === 'service.environment') return false;
      if (f.meta?.key === 'service.name' && serviceName) return false;
      return true;
    })
    .map(filterToKql)
    .filter((s): s is string => Boolean(s));

  const fragments = [
    urlKuery.trim() ? `(${urlKuery.trim()})` : undefined,
    ...controlsKql,
    ...pillsKql,
  ].filter((s): s is string => Boolean(s));

  return {
    kuery: fragments.length > 0 ? fragments.join(' and ') : undefined,
    service_name: serviceName || undefined,
  };
}

/** Internal — exposed for unit tests of the pure filter-projection logic. */
export const __testOnly__ = { capturePageFilters };

export function AddToDashboardButton({
  environment,
  kuery,
  start,
  end,
  rangeFrom,
  rangeTo,
  serviceName,
  serviceGroupId,
  mapOrientation,
  viewFilters,
  controlIconCss,
}: AddToDashboardButtonProps) {
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const embeddable = services?.embeddable;
  const filterManager = services?.data?.query?.filterManager;
  const telemetry = services?.telemetry;
  const toasts = services?.notifications?.toasts;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSave: SaveModalDashboardProps['onSave'] = useCallback(
    async ({ dashboardId, newTitle, newDescription }) => {
      const failWithToast = () => {
        toasts?.addDanger(
          i18n.translate('xpack.apm.serviceMap.copyToDashboard.saveErrorToast', {
            defaultMessage: 'Unable to open the dashboard with the service map panel.',
          })
        );
      };

      if (!embeddable) {
        failWithToast();
        return;
      }
      const stateTransfer = embeddable.getStateTransfer();

      const { kuery: capturedKuery, service_name: capturedServiceName } = capturePageFilters({
        urlKuery: kuery,
        urlServiceName: serviceName,
        filterManagerFilters: filterManager?.getFilters() ?? [],
        controlSelections: readInitialAppStateFromRawUrl()?.controlSelections ?? {},
      });

      const serializedState: ServiceMapEmbeddableState = {
        title: newTitle,
        description: newDescription,
        // No `time_range` here: the panel inherits the dashboard's global time range
        // (which we seed from APM below via `dashboardPathForId`). The user can set a
        // custom panel time later via the dashboard panel-menu's "Customize time range"
        // action.
        environment,
        kuery: capturedKuery,
        service_name: capturedServiceName,
        service_group_id: serviceGroupId || undefined,
        map_orientation: mapOrientation,
        // Default OFF: the panel uses only its own captured filters and ignores the
        // dashboard's KQL/Controls (the user opted into copying THIS view, not following
        // the dashboard). Stored explicitly for clarity.
        sync_with_dashboard_filters: false,
        // Snapshot the options-panel selections so the dashboard panel renders with the
        // same filter chips selected. Empty arrays are dropped to keep saved state minimal.
        alert_status_filter: viewFilters.alertStatusFilter.length
          ? viewFilters.alertStatusFilter
          : undefined,
        slo_status_filter: viewFilters.sloStatusFilter.length
          ? viewFilters.sloStatusFilter
          : undefined,
        connection_filter: viewFilters.connectionFilter.length
          ? viewFilters.connectionFilter
          : undefined,
        anomaly_severity_filter: viewFilters.anomalySeverityFilter.length
          ? viewFilters.anomalySeverityFilter
          : undefined,
      };

      const packageState: EmbeddablePackageState<ServiceMapEmbeddableState> = {
        type: APM_SERVICE_MAP_EMBEDDABLE,
        serializedState,
      };

      // Prefer the raw URL range so a relative APM range (e.g. `now-15m`/`now`) seeds the
      // dashboard as a live relative range instead of a frozen absolute window. Fall back
      // to the resolved absolute start/end when the raw range isn't available.
      const path = dashboardPathForId(dashboardId, {
        from: rangeFrom ?? start,
        to: rangeTo ?? end,
      });

      telemetry?.reportServiceMapAddedToDashboard({
        new_dashboard: dashboardId === 'new',
        has_service_name: Boolean(capturedServiceName),
        has_kuery: Boolean(capturedKuery),
        view_filter_count:
          (serializedState.alert_status_filter?.length ?? 0) +
          (serializedState.slo_status_filter?.length ?? 0) +
          (serializedState.connection_filter?.length ?? 0) +
          (serializedState.anomaly_severity_filter?.length ?? 0),
        sync_with_dashboard_filters: serializedState.sync_with_dashboard_filters ?? false,
      });

      try {
        await stateTransfer.navigateToWithEmbeddablePackages<ServiceMapEmbeddableState>(
          'dashboards',
          {
            state: [packageState],
            path,
          }
        );
      } catch {
        failWithToast();
      }
    },
    [
      embeddable,
      toasts,
      telemetry,
      filterManager,
      kuery,
      serviceName,
      start,
      end,
      rangeFrom,
      rangeTo,
      environment,
      serviceGroupId,
      mapOrientation,
      viewFilters,
    ]
  );

  // Hide entirely when the host doesn't expose the embeddable plugin (e.g. unit tests
  // that don't wire a kibana context).
  if (!embeddable) {
    return null;
  }

  const objectType = i18n.translate('xpack.apm.serviceMap.addToDashboard.objectTypeLabel', {
    defaultMessage: 'Service map',
  });

  const attachmentTitle = i18n.translate('xpack.apm.serviceMap.addToDashboard.attachmentTitle', {
    defaultMessage: 'Service map',
  });

  const buttonLabel = i18n.translate('xpack.apm.serviceMap.copyToDashboardButton', {
    defaultMessage: 'Copy to dashboard',
  });

  return (
    <>
      <EuiToolTip content={buttonLabel} disableScreenReaderOutput position="top">
        <EuiButtonIcon
          display="empty"
          color="text"
          size="s"
          iconSize="m"
          iconType="addToDashboard"
          aria-label={buttonLabel}
          onClick={() => setIsModalOpen(true)}
          data-test-subj="apmServiceMapCopyToDashboardButton"
          css={controlIconCss}
        />
      </EuiToolTip>
      {isModalOpen && (
        <SavedObjectSaveModalDashboard
          objectType={objectType}
          documentInfo={{ title: attachmentTitle }}
          canSaveByReference={false}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
