/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSkeletonText,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SERVICE_NAME, SERVICE_ENVIRONMENT } from '@kbn/apm-types';
import type { Query, TimeRange } from '@kbn/es-query';
import type { AlertStatus } from '@kbn/rule-data-utils';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import datemath from '@kbn/datemath';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';
import type { Environment } from '../../../common/environment_rt';
import type { ServiceMapEmbeddableState } from '../../../server/lib/embeddables/service_map_embeddable_schema';
import type { EmbeddableDeps } from '../types';
import { useSuggestions } from './use_suggestions';
import { useAdHocApmDataView } from '../../hooks/use_adhoc_apm_data_view';
import type { ConnectionFilter } from '../../components/app/service_map/apply_service_map_visibility';
import type { SloStatus } from '../../../common/service_inventory';
import { type ServiceMapOrientation } from '../../components/app/service_map/service_map_options_panel';
import {
  ALERT_STATUS_OPTIONS,
  ANOMALY_SEVERITY_OPTIONS,
  CONNECTION_FILTER_OPTIONS,
  SLO_STATUS_OPTIONS,
  getDecoratedAlertStatusOptions,
  getDecoratedAnomalySeverityOptions,
  getDecoratedConnectionOptions,
  getDecoratedSloStatusOptions,
} from '../../components/app/service_map/service_map_filter_combobox_options';
import { useServiceMap } from '../../components/app/service_map/use_service_map';
import { useServiceMapBadges } from '../../components/app/service_map/use_service_map_badges';
import {
  computeServiceMapFilterOptionCounts,
  type ServiceMapFilterOptionCounts,
} from '../../components/app/service_map/service_map_filter_option_counts';

interface KueryInputProps {
  kuery: string;
  onChange: (kuery: string) => void;
  deps: EmbeddableDeps;
}

function KueryInput({ kuery, onChange, deps }: KueryInputProps) {
  const { QueryStringInput } = deps.pluginsStart.kql;
  const { dataView } = useAdHocApmDataView();
  const isLoading = !dataView;

  const query: Query = useMemo(() => ({ query: kuery, language: 'kuery' }), [kuery]);

  const handleChange = useCallback(
    (newQuery: Query) => {
      onChange(String(newQuery.query));
    },
    [onChange]
  );

  const kqlDocsUrl = deps.coreStart.docLinks.links.query.kueryQuerySyntax;

  const helpText = (
    <>
      {i18n.translate('xpack.apm.serviceMapEditor.kueryHelpText', {
        defaultMessage: 'Additional filter using KQL syntax.',
      })}{' '}
      <EuiLink
        data-test-subj="apmKueryInputLearnMoreLink"
        href={kqlDocsUrl}
        target="_blank"
        external
      >
        {i18n.translate('xpack.apm.serviceMapEditor.kueryHelpLink', {
          defaultMessage: 'Learn more',
        })}
      </EuiLink>
    </>
  );

  if (isLoading) {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.apm.serviceMapEditor.kueryLabel', {
          defaultMessage: 'KQL filter (optional)',
        })}
        helpText={helpText}
        fullWidth
      >
        <EuiSkeletonText lines={1} />
      </EuiFormRow>
    );
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.apm.serviceMapEditor.kueryLabel', {
        defaultMessage: 'KQL filter (optional)',
      })}
      helpText={helpText}
      fullWidth
    >
      <QueryStringInput
        appName="apm"
        indexPatterns={dataView ? [dataView] : []}
        query={query}
        onChange={handleChange}
        onSubmit={handleChange}
        placeholder={i18n.translate('xpack.apm.serviceMapEditor.kueryPlaceholder', {
          defaultMessage: 'Filter service map using KQL syntax',
        })}
        disableLanguageSwitcher
        autoSubmit
        dataTestSubj="apmServiceMapEditorKueryInput"
      />
    </EuiFormRow>
  );
}

export interface ServiceMapEditorFlyoutProps {
  onCancel: () => void;
  onSave: (state: ServiceMapEmbeddableState) => void;
  initialState?: ServiceMapEmbeddableState;
  ariaLabelledBy: string;
  deps: EmbeddableDeps;
  timeRange?: TimeRange;
}

function getEnvironmentOptions(environments: string[]) {
  const environmentOptions = environments
    .filter((env) => env !== ENVIRONMENT_NOT_DEFINED.value)
    .map((environment) => ({
      value: environment,
      label: environment,
    }));

  return [
    ENVIRONMENT_ALL,
    ...(environments.includes(ENVIRONMENT_NOT_DEFINED.value) ? [ENVIRONMENT_NOT_DEFINED] : []),
    ...environmentOptions,
  ];
}

const DEFAULT_RANGE_FROM = 'now-15m';
const DEFAULT_RANGE_TO = 'now';

/** Flex shell so header/body/footer lay out inside Core flyouts without changing `OverlayMountWrapper`. */
const serviceMapFlyoutShellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 0%',
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
};

function getTimeRange(timeRange?: Partial<TimeRange>) {
  const rangeFrom = timeRange?.from ?? DEFAULT_RANGE_FROM;
  const rangeTo = timeRange?.to ?? DEFAULT_RANGE_TO;
  const start = datemath.parse(rangeFrom)?.toISOString() ?? rangeFrom;
  const end = datemath.parse(rangeTo, { roundUp: true })?.toISOString() ?? rangeTo;
  return { start, end };
}

/**
 * Hidden helper component that drives the lazy service-map + badges fetch for the
 * flyout's filter `(count)` badges. Mounted on first filter-combobox focus so the
 * fetch only fires when the user actually opens a filter dropdown; unmounting it
 * cancels the inner subscriptions. `useServiceMap` itself has no `enabled` flag,
 * so the cleanest skip is to not mount the hook chain at all.
 */
function FlyoutFilterOptionCountsResolver({
  environment,
  kuery,
  start,
  end,
  serviceName,
  onResolve,
}: {
  environment: Environment;
  kuery: string;
  start: string;
  end: string;
  serviceName: string | undefined;
  onResolve: (counts: ServiceMapFilterOptionCounts) => void;
}) {
  const { data: serviceMapData, status: serviceMapStatus } = useServiceMap({
    environment,
    kuery,
    start,
    end,
    serviceName: serviceName || undefined,
  });
  const { nodes: nodesWithBadges } = useServiceMapBadges({
    environment,
    start,
    end,
    kuery,
    nodes: serviceMapData.nodes,
    nodesStatus: serviceMapStatus,
  });
  const counts = useMemo(
    () => computeServiceMapFilterOptionCounts(nodesWithBadges, serviceMapData.edges),
    [nodesWithBadges, serviceMapData.edges]
  );
  useEffect(() => {
    onResolve(counts);
  }, [counts, onResolve]);
  return null;
}

export function ServiceMapEditorFlyout({
  onCancel,
  onSave,
  initialState,
  ariaLabelledBy,
  deps,
  timeRange,
}: ServiceMapEditorFlyoutProps) {
  const isEditing = !!initialState;

  const [environment, setEnvironment] = useState<Environment>(
    initialState?.environment ?? ENVIRONMENT_ALL.value
  );
  const [kuery, setKuery] = useState(initialState?.kuery ?? '');
  const [serviceName, setServiceName] = useState(initialState?.service_name ?? '');
  const [syncWithDashboardFilters, setSyncWithDashboardFilters] = useState<boolean>(
    initialState?.sync_with_dashboard_filters ?? false
  );
  const [alertStatusFilter, setAlertStatusFilter] = useState<AlertStatus[]>(
    initialState?.alert_status_filter ?? []
  );
  const [sloStatusFilter, setSloStatusFilter] = useState<SloStatus[]>(
    initialState?.slo_status_filter ?? []
  );
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter[]>(
    initialState?.connection_filter ?? []
  );
  // Schema types the array as a string-literal union; cast at the boundary into the enum type the
  // graph + filter helpers consume. The literal values are identical to the enum values.
  const [anomalySeverityFilter, setAnomalySeverityFilter] = useState<ML_ANOMALY_SEVERITY[]>(
    (initialState?.anomaly_severity_filter as ML_ANOMALY_SEVERITY[] | undefined) ?? []
  );
  const [mapOrientation, setMapOrientation] = useState<ServiceMapOrientation>(
    initialState?.map_orientation ?? 'horizontal'
  );

  const [selectedServiceOption, setSelectedServiceOption] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(serviceName ? [{ value: serviceName, label: serviceName }] : []);
  const [selectedEnvironmentOption, setSelectedEnvironmentOption] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([{ value: environment, label: getEnvironmentLabel(environment) }]);

  const rangeFrom = timeRange?.from;
  const rangeTo = timeRange?.to;
  const { start, end } = useMemo(
    () => getTimeRange({ from: rangeFrom, to: rangeTo }),
    [rangeFrom, rangeTo]
  );

  const {
    terms: serviceNameTerms,
    isLoading: isLoadingServiceNames,
    onSearchChange: onServiceNameSearchChange,
  } = useSuggestions({
    core: deps.coreStart,
    fieldName: SERVICE_NAME,
    start,
    end,
    fetchOnMount: true,
  });

  const {
    terms: environmentTerms,
    isLoading: isLoadingEnvironments,
    onSearchChange: onEnvironmentSearchChange,
  } = useSuggestions({
    core: deps.coreStart,
    fieldName: SERVICE_ENVIRONMENT,
    start,
    end,
    serviceName: serviceName || undefined,
    fetchOnMount: true,
  });

  const serviceNameOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => serviceNameTerms.map((term) => ({ value: term, label: term })),
    [serviceNameTerms]
  );

  const environmentOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => getEnvironmentOptions(environmentTerms),
    [environmentTerms]
  );

  // Filter (count) badges + disable-zero-count UX requires a live service-map fetch
  // scoped to the user's current env / time / KQL / service-name. To avoid kicking that
  // fetch on every flyout open (the user may never touch the filter rows), only mount
  // the resolver after the user focuses any filter combobox — see `onFilterFocus`.
  const [filterCountsEnabled, setFilterCountsEnabled] = useState<boolean>(
    // Already-selected filters are a strong signal the user cares about counts; pre-warm
    // the fetch so the badges are ready by the time they open a dropdown to change one.
    () =>
      alertStatusFilter.length > 0 ||
      sloStatusFilter.length > 0 ||
      connectionFilter.length > 0 ||
      anomalySeverityFilter.length > 0
  );
  const onFilterFocus = useCallback(() => setFilterCountsEnabled(true), []);
  const [filterOptionCounts, setFilterOptionCounts] = useState<
    ServiceMapFilterOptionCounts | undefined
  >(undefined);
  const connectionFilterComboBoxOptions = useMemo(
    () =>
      filterOptionCounts
        ? getDecoratedConnectionOptions(filterOptionCounts.connection)
        : CONNECTION_FILTER_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [filterOptionCounts]
  );
  const alertStatusComboBoxOptions = useMemo(
    () =>
      filterOptionCounts
        ? getDecoratedAlertStatusOptions(filterOptionCounts.alerts)
        : ALERT_STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [filterOptionCounts]
  );
  const sloStatusComboBoxOptions = useMemo(
    () =>
      filterOptionCounts
        ? getDecoratedSloStatusOptions(filterOptionCounts.slo)
        : SLO_STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [filterOptionCounts]
  );
  const anomalySeverityComboBoxOptions = useMemo(
    () =>
      filterOptionCounts
        ? getDecoratedAnomalySeverityOptions(filterOptionCounts.anomaly)
        : ANOMALY_SEVERITY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [filterOptionCounts]
  );

  const onServiceNameSelect = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (changedOptions.length === 0) {
      setServiceName('');
      setSelectedServiceOption([]);
    } else if (changedOptions.length === 1 && changedOptions[0].value) {
      setServiceName(changedOptions[0].value);
      setSelectedServiceOption(changedOptions);
    }
    setEnvironment(ENVIRONMENT_ALL.value);
    setSelectedEnvironmentOption([ENVIRONMENT_ALL]);
  };

  const onServiceNameCreateOption = (searchValue: string) => {
    const value = searchValue.trim();
    if (!value) {
      return;
    }

    onServiceNameSelect([{ value, label: value }]);
  };

  const onEnvironmentSelect = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (changedOptions.length === 1 && changedOptions[0].value) {
      setEnvironment(changedOptions[0].value as Environment);
      setSelectedEnvironmentOption(changedOptions);
    }
  };

  const handleSave = useCallback(() => {
    const state: ServiceMapEmbeddableState = {
      environment,
      kuery: kuery.trim() ? kuery : undefined,
      service_name: serviceName || undefined,
      sync_with_dashboard_filters: syncWithDashboardFilters,
      // Empty arrays drop to undefined so they're omitted from the saved object payload.
      alert_status_filter: alertStatusFilter.length ? alertStatusFilter : undefined,
      slo_status_filter: sloStatusFilter.length ? sloStatusFilter : undefined,
      connection_filter: connectionFilter.length ? connectionFilter : undefined,
      anomaly_severity_filter: anomalySeverityFilter.length ? anomalySeverityFilter : undefined,
      map_orientation: mapOrientation,
    };
    onSave(state);
  }, [
    environment,
    kuery,
    serviceName,
    syncWithDashboardFilters,
    alertStatusFilter,
    sloStatusFilter,
    connectionFilter,
    anomalySeverityFilter,
    mapOrientation,
    onSave,
  ]);

  return (
    <div style={serviceMapFlyoutShellStyle}>
      <EuiFlyoutHeader hasBorder data-test-subj="apmServiceMapEditorFlyout">
        <EuiTitle size="s">
          <h2 id={ariaLabelledBy}>
            {isEditing ? (
              <FormattedMessage
                id="xpack.apm.serviceMapEditor.editTitle"
                defaultMessage="Edit service map"
              />
            ) : (
              <FormattedMessage
                id="xpack.apm.serviceMapEditor.addTitle"
                defaultMessage="Create service map panel"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody style={{ flex: '1 1 auto', minHeight: 0 }}>
        <EuiForm fullWidth>
          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMapEditor.serviceNameLabel', {
              defaultMessage: 'Service name (optional)',
            })}
            helpText={i18n.translate('xpack.apm.serviceMapEditor.serviceNameHelpText', {
              defaultMessage:
                'Filter to show only a specific service and its connections. Leave blank to show all services.',
            })}
            fullWidth
          >
            <EuiComboBox
              aria-label={i18n.translate(
                'xpack.apm.serviceMapEditor.serviceNameComboBox.ariaLabel',
                {
                  defaultMessage: 'Select service name',
                }
              )}
              compressed
              fullWidth
              async
              isClearable
              placeholder={i18n.translate('xpack.apm.serviceMapEditor.serviceNamePlaceholder', {
                defaultMessage: 'Search for a service...',
              })}
              singleSelection={{ asPlainText: true }}
              options={serviceNameOptions}
              selectedOptions={selectedServiceOption}
              onChange={onServiceNameSelect}
              onCreateOption={onServiceNameCreateOption}
              onSearchChange={onServiceNameSearchChange}
              customOptionText={i18n.translate(
                'xpack.apm.serviceMapEditor.serviceNameComboBox.customServiceNameFilterOptionLabel',
                {
                  defaultMessage: `Filter by service name '{searchValue}'`,
                }
              )}
              isLoading={isLoadingServiceNames}
              data-test-subj={`apmServiceMapEditorServiceNameComboBox${
                isLoadingServiceNames ? 'Loading' : ''
              }`}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMapEditor.environmentLabel', {
              defaultMessage: 'Environment',
            })}
            fullWidth
          >
            <EuiComboBox
              aria-label={i18n.translate(
                'xpack.apm.serviceMapEditor.environmentComboBox.ariaLabel',
                {
                  defaultMessage: 'Select environment',
                }
              )}
              compressed
              fullWidth
              async
              isClearable={false}
              placeholder={i18n.translate('xpack.apm.serviceMapEditor.environmentPlaceholder', {
                defaultMessage: 'Select environment',
              })}
              singleSelection={{ asPlainText: true }}
              options={environmentOptions}
              selectedOptions={selectedEnvironmentOption}
              onChange={onEnvironmentSelect}
              onSearchChange={onEnvironmentSearchChange}
              isLoading={isLoadingEnvironments}
              data-test-subj={`apmServiceMapEditorEnvironmentComboBox${
                isLoadingEnvironments ? 'Loading' : ''
              }`}
            />
          </EuiFormRow>

          <KueryInput kuery={kuery} onChange={setKuery} deps={deps} />

          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMapEditor.dependenciesFilterLabel', {
              defaultMessage: 'Dependencies',
            })}
            fullWidth
          >
            <EuiComboBox
              compressed
              fullWidth
              isClearable
              placeholder={i18n.translate(
                'xpack.apm.serviceMapEditor.dependenciesFilterPlaceholder',
                { defaultMessage: 'Filter by dependency status' }
              )}
              options={connectionFilterComboBoxOptions}
              selectedOptions={connectionFilter.map((value) => {
                const opt = CONNECTION_FILTER_OPTIONS.find((o) => o.value === value);
                return { label: opt?.label ?? value, value };
              })}
              onChange={(selected) =>
                setConnectionFilter(selected.map((s) => s.value as ConnectionFilter))
              }
              data-test-subj="apmServiceMapEditorConnectionFilter"
              onFocus={onFilterFocus}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMapEditor.alertStatusFilterLabel', {
              defaultMessage: 'Alert status',
            })}
            fullWidth
          >
            <EuiComboBox
              compressed
              fullWidth
              isClearable
              placeholder={i18n.translate(
                'xpack.apm.serviceMapEditor.alertStatusFilterPlaceholder',
                { defaultMessage: 'Filter by alert status' }
              )}
              options={alertStatusComboBoxOptions}
              selectedOptions={alertStatusFilter.map((value) => {
                const opt = ALERT_STATUS_OPTIONS.find((o) => o.value === value);
                return { label: opt?.label ?? value, value };
              })}
              onChange={(selected) =>
                setAlertStatusFilter(selected.map((s) => s.value as AlertStatus))
              }
              data-test-subj="apmServiceMapEditorAlertStatusFilter"
              onFocus={onFilterFocus}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMapEditor.sloStatusFilterLabel', {
              defaultMessage: 'SLO status',
            })}
            fullWidth
          >
            <EuiComboBox
              compressed
              fullWidth
              isClearable
              placeholder={i18n.translate('xpack.apm.serviceMapEditor.sloStatusFilterPlaceholder', {
                defaultMessage: 'Filter by SLO status',
              })}
              options={sloStatusComboBoxOptions}
              selectedOptions={sloStatusFilter.map((value) => {
                const opt = SLO_STATUS_OPTIONS.find((o) => o.value === value);
                return { label: opt?.label ?? value, value };
              })}
              onChange={(selected) =>
                setSloStatusFilter(selected.map((s) => s.value as SloStatus))
              }
              data-test-subj="apmServiceMapEditorSloStatusFilter"
              onFocus={onFilterFocus}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMapEditor.anomalySeverityFilterLabel', {
              defaultMessage: 'Anomaly severity',
            })}
            fullWidth
          >
            <EuiComboBox
              compressed
              fullWidth
              isClearable
              placeholder={i18n.translate(
                'xpack.apm.serviceMapEditor.anomalySeverityFilterPlaceholder',
                { defaultMessage: 'Filter by anomaly severity' }
              )}
              options={anomalySeverityComboBoxOptions}
              selectedOptions={anomalySeverityFilter.map((value) => {
                const opt = ANOMALY_SEVERITY_OPTIONS.find((o) => o.value === value);
                return { label: opt?.label ?? value, value };
              })}
              onChange={(selected) =>
                setAnomalySeverityFilter(
                  selected.map((s) => s.value as ML_ANOMALY_SEVERITY)
                )
              }
              data-test-subj="apmServiceMapEditorAnomalySeverityFilter"
              onFocus={onFilterFocus}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMapEditor.orientationLabel', {
              defaultMessage: 'Presentation',
            })}
            fullWidth
          >
            <EuiButtonGroup
              isFullWidth
              buttonSize="compressed"
              legend={i18n.translate('xpack.apm.serviceMapEditor.orientationLegend', {
                defaultMessage: 'Service map presentation',
              })}
              idSelected={mapOrientation}
              onChange={(id) => setMapOrientation(id as ServiceMapOrientation)}
              options={[
                {
                  id: 'horizontal',
                  label: i18n.translate('xpack.apm.serviceMapEditor.orientationHorizontal', {
                    defaultMessage: 'Horizontal',
                  }),
                  iconType: 'arrowRight',
                  'data-test-subj': 'apmServiceMapEditorOrientationHorizontal',
                },
                {
                  id: 'vertical',
                  label: i18n.translate('xpack.apm.serviceMapEditor.orientationVertical', {
                    defaultMessage: 'Vertical',
                  }),
                  iconType: 'arrowDown',
                  'data-test-subj': 'apmServiceMapEditorOrientationVertical',
                },
              ]}
              data-test-subj="apmServiceMapEditorOrientation"
            />
          </EuiFormRow>

          <EuiFormRow
            helpText={i18n.translate('xpack.apm.serviceMapEditor.syncFiltersHelpText', {
              defaultMessage:
                "When on, the panel responds to the dashboard's global filters and search. Time range is not synced — it stays panel-owned.",
            })}
            fullWidth
          >
            <EuiSwitch
              label={i18n.translate('xpack.apm.serviceMapEditor.syncFiltersLabel', {
                defaultMessage: 'Sync with dashboard filters',
              })}
              checked={syncWithDashboardFilters}
              onChange={(e) => setSyncWithDashboardFilters(e.target.checked)}
              data-test-subj="apmServiceMapEditorSyncFiltersToggle"
            />
          </EuiFormRow>
        </EuiForm>
        {filterCountsEnabled && (
          <FlyoutFilterOptionCountsResolver
            environment={environment}
            kuery={kuery}
            start={start}
            end={end}
            serviceName={serviceName}
            onResolve={setFilterOptionCounts}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              color="primary"
              size="m"
              flush="left"
              data-test-subj="apmServiceMapEditorCancelButton"
            >
              <FormattedMessage
                id="xpack.apm.serviceMapEditor.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleSave}
              fill
              color="primary"
              size="m"
              data-test-subj="apmServiceMapEditorSaveButton"
            >
              {isEditing ? (
                <FormattedMessage
                  id="xpack.apm.serviceMapEditor.saveButton"
                  defaultMessage="Save"
                />
              ) : (
                <FormattedMessage
                  id="xpack.apm.serviceMapEditor.addPanelButton"
                  defaultMessage="Add panel"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </div>
  );
}
