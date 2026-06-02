/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { Filter } from '@kbn/es-query';
import { getPhraseFilterValue, isPhraseFilter, isPhrasesFilter } from '@kbn/es-query';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { SavedObjectSaveModalDashboard } from '@kbn/presentation-util-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApmPluginStartDeps, ApmServices } from '../../../plugin';
import { APM_SERVICE_MAP_EMBEDDABLE } from '../../../embeddable/service_map/constants';
import type { ServiceMapEmbeddableState } from '../../../../server/lib/embeddables/service_map_embeddable_schema';
import type { Environment } from '../../../../common/environment_rt';
import type { ServiceMapOrientation } from './service_map_options_panel';
import type { ServiceMapViewFilters } from './apply_service_map_visibility';
import { readInitialAppStateFromRawUrl } from './use_filter_url_sync';

interface AddToDashboardButtonProps {
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  serviceName?: string;
  serviceGroupId?: string;
  mapOrientation: ServiceMapOrientation;
  viewFilters: ServiceMapViewFilters;
  /** Current find-in-page query — captured into the dashboard panel state. */
  searchQuery: string;
}

/** Serialize a single string value as a quoted KQL phrase. */
function quoteKqlValue(value: string): string {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

/** Convert a phrase / phrases filter to a KQL fragment; returns `undefined` for unsupported filter shapes. */
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
 * Service-name pills with the same value as the promoted `service_name` are skipped to
 * avoid double-filtering; pills with a different value are kept as KQL clauses.
 */
function capturePageFilters({
  urlKuery,
  urlServiceName,
  filterManagerFilters,
}: {
  urlKuery: string;
  urlServiceName: string | undefined;
  filterManagerFilters: Filter[];
}): { kuery: string | undefined; service_name: string | undefined } {
  const appState = readInitialAppStateFromRawUrl();
  const controlSelections = appState?.controlSelections ?? {};

  // Promote a single Controls API service.name selection to the dedicated field
  // when no URL service name is set. Multiple selections stay as a KQL clause.
  let serviceName = urlServiceName;
  let promotedServiceNameFromControls = false;
  const serviceNameSelection = controlSelections['service.name'];
  if (!serviceName && serviceNameSelection && serviceNameSelection.length === 1) {
    serviceName = serviceNameSelection[0];
    promotedServiceNameFromControls = true;
  }

  // Build KQL fragments from remaining Controls selections.
  const remainingSelections: Record<string, string[]> = { ...controlSelections };
  delete remainingSelections['service.environment'];
  if (promotedServiceNameFromControls) {
    delete remainingSelections['service.name'];
  }
  const controlsKql = controlSelectionsToKql(remainingSelections);

  // Build KQL fragments from filter-bar pills:
  // - skip env (dedicated URL param)
  // - skip a service.name pill whose value matches the promoted service_name (avoid duplicate)
  const pillsKql = filterManagerFilters
    .filter((f) => {
      if (f.meta?.key === 'service.environment') return false;
      if (f.meta?.key === 'service.name' && serviceName && isPhraseFilter(f)) {
        return String(getPhraseFilterValue(f)) !== serviceName;
      }
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
  serviceName,
  serviceGroupId,
  mapOrientation,
  viewFilters,
  searchQuery,
}: AddToDashboardButtonProps) {
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const embeddable = services?.embeddable;
  const filterManager = services?.data?.query?.filterManager;
  const telemetry = services?.telemetry;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSave: SaveModalDashboardProps['onSave'] = useCallback(
    async ({ dashboardId, newTitle, newDescription }) => {
      if (!embeddable) return;
      const stateTransfer = embeddable.getStateTransfer();

      const { kuery: capturedKuery, service_name: capturedServiceName } = capturePageFilters({
        urlKuery: kuery,
        urlServiceName: serviceName,
        filterManagerFilters: filterManager?.getFilters() ?? [],
      });

      const serializedState: ServiceMapEmbeddableState = {
        title: newTitle,
        description: newDescription,
        time_range: { from: start, to: end },
        environment,
        kuery: capturedKuery,
        service_name: capturedServiceName,
        service_group_id: serviceGroupId || undefined,
        map_orientation: mapOrientation,
        // Default ON for the APM-UI creation flow: the user explicitly chose to put this
        // view on a dashboard, so they likely want it to behave like a dashboard panel.
        sync_with_dashboard_filters: true,
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
        find_query: searchQuery.trim() ? searchQuery : undefined,
      };

      const packageState: EmbeddablePackageState<ServiceMapEmbeddableState> = {
        type: APM_SERVICE_MAP_EMBEDDABLE,
        serializedState,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

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

      stateTransfer.navigateToWithEmbeddablePackages<ServiceMapEmbeddableState>('dashboards', {
        state: [packageState],
        path,
      });
    },
    [
      embeddable,
      telemetry,
      filterManager,
      kuery,
      serviceName,
      start,
      end,
      environment,
      serviceGroupId,
      mapOrientation,
      viewFilters,
      searchQuery,
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

  const menuLabel = i18n.translate('xpack.apm.serviceMap.panelActions.menuLabel', {
    defaultMessage: 'More actions',
  });

  const menuItems = useMemo(
    () => [
      <EuiContextMenuItem
        key="copyToDashboard"
        icon="addToDashboard"
        onClick={() => {
          setIsMenuOpen(false);
          setIsModalOpen(true);
        }}
        data-test-subj="apmServiceMapCopyToDashboardMenuItem"
      >
        {i18n.translate('xpack.apm.serviceMap.copyToDashboardMenuItem', {
          defaultMessage: 'Copy to dashboard',
        })}
      </EuiContextMenuItem>,
    ],
    []
  );

  return (
    <>
      <EuiPopover
        anchorPosition="downRight"
        panelPaddingSize="none"
        isOpen={isMenuOpen}
        closePopover={() => setIsMenuOpen(false)}
        button={
          <EuiButtonIcon
            iconType="boxesHorizontal"
            color="text"
            display="base"
            size="s"
            aria-label={menuLabel}
            title={menuLabel}
            onClick={() => setIsMenuOpen((open) => !open)}
            data-test-subj="apmServiceMapPanelActionsButton"
          />
        }
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>
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
