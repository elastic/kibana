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
  /** Resolved absolute start/end — fallback when no raw URL range is available. */
  start: string;
  end: string;
  /** Raw URL range (may be relative, e.g. `now-15m`). Preferred over resolved timestamps. */
  rangeFrom?: string;
  rangeTo?: string;
  serviceName?: string;
  serviceGroupId?: string;
  mapOrientation: ServiceMapOrientation;
  viewFilters: ServiceMapViewFilters;
  controlIconCss?: SerializedStyles;
}

function quoteKqlValue(value: string): string {
  return `"${escapeQuotes(String(value))}"`;
}

// Note: encoding `_g=(time:...)` replaces the whole `_g` payload, dropping pinned filters /
// custom refresh interval on an existing dashboard. Lens does the same.
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

// Range/custom filters aren't representable as KQL and are intentionally dropped.
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

function controlSelectionsToKql(selections: Record<string, string[]>): string[] {
  return Object.entries(selections)
    .filter(([, values]) => values.length > 0)
    .map(([field, values]) =>
      values.length === 1
        ? `${field}: ${quoteKqlValue(values[0])}`
        : `${field}: (${values.map(quoteKqlValue).join(' or ')})`
    );
}

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
  let serviceName = urlServiceName;
  const serviceNameSelection = controlSelections['service.name'];
  if (!serviceName && serviceNameSelection && serviceNameSelection.length === 1) {
    serviceName = serviceNameSelection[0];
  }

  const remainingSelections: Record<string, string[]> = { ...controlSelections };
  delete remainingSelections['service.environment'];
  if (serviceName) {
    delete remainingSelections['service.name'];
  }
  const controlsKql = controlSelectionsToKql(remainingSelections);

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
            defaultMessage: 'Unable to save the service map panel to the dashboard.',
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
        environment,
        kuery: capturedKuery,
        service_name: capturedServiceName,
        service_group_id: serviceGroupId || undefined,
        map_orientation: mapOrientation,
        sync_with_dashboard_filters: false,
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
