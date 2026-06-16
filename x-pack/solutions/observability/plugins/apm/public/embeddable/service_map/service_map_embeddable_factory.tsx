/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type {
  HasEditCapabilities,
  PublishesBlockingError,
  PublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import {
  initializeStateManager,
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
  useFetchContext,
  type StateComparators,
  type WithAllKeys,
} from '@kbn/presentation-publishing';
import { initializeStateApi } from '@kbn/presentation-publishing';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { openLazyFlyout } from '@kbn/presentation-util';
import { BehaviorSubject, combineLatest, map, merge } from 'rxjs';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '@kbn/apm-types';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../common/environment_filter_values';
import type {
  ServiceMapCustomState,
  ServiceMapEmbeddableState,
} from '../../../server/lib/embeddables/service_map_embeddable_schema';

import type { EmbeddableDeps } from '../types';
import { ApmEmbeddableContext } from '../embeddable_context';
import type { ServiceMapViewFilters } from '../../components/app/service_map/apply_service_map_visibility';
import { ServiceMapEmbeddable } from './service_map_embeddable';
import { ServiceMapEditorFlyout } from './service_map_editor_flyout';
import { APM_SERVICE_MAP_EMBEDDABLE } from './constants';

const DEFAULT_TIME_RANGE: TimeRange = { from: 'now-15m', to: 'now' };

const defaultCustomState: WithAllKeys<ServiceMapCustomState> = {
  environment: ENVIRONMENT_ALL.value,
  kuery: undefined,
  service_name: undefined,
  service_group_id: undefined,
  map_orientation: 'horizontal',
  // Default OFF: the panel uses only its own captured filters and ignores the
  // dashboard's KQL/Controls. Dashboards usually have broader filter contexts
  // that don't make sense for a service map.
  sync_with_dashboard_filters: false,
  alert_status_filter: undefined,
  slo_status_filter: undefined,
  connection_filter: undefined,
  anomaly_severity_filter: undefined,
  find_query: undefined,
};

const customStateComparators: StateComparators<ServiceMapCustomState> = {
  environment: 'referenceEquality',
  kuery: 'referenceEquality',
  service_name: 'referenceEquality',
  service_group_id: 'referenceEquality',
  map_orientation: 'referenceEquality',
  sync_with_dashboard_filters: 'referenceEquality',
  // Array fields use deepEquality: the editor flyout's handleSave + the in-graph options
  // panel both produce fresh arrays on every save, which would otherwise mark the panel
  // dirty regardless of whether the selected values actually changed.
  alert_status_filter: 'deepEquality',
  slo_status_filter: 'deepEquality',
  connection_filter: 'deepEquality',
  anomaly_severity_filter: 'deepEquality',
  find_query: 'referenceEquality',
};

export type ServiceMapEmbeddableApi = DefaultEmbeddableApi<ServiceMapEmbeddableState> &
  HasEditCapabilities &
  PublishesBlockingError &
  PublishesUnifiedSearch & {
    setTimeRange: (timeRange: TimeRange | undefined) => void;
    canEditUnifiedSearch: () => boolean;
  };

function buildFiltersFromState(
  serviceName: string | undefined,
  environment: string | undefined
): Filter[] {
  const filters: Filter[] = [];

  if (serviceName) {
    filters.push({
      meta: { key: SERVICE_NAME, type: 'phrase', params: { query: serviceName } },
      query: { match_phrase: { [SERVICE_NAME]: serviceName } },
    });
  }

  if (environment && environment !== ENVIRONMENT_ALL.value) {
    if (environment === ENVIRONMENT_NOT_DEFINED.value) {
      filters.push({
        meta: { key: SERVICE_ENVIRONMENT, type: 'exists', negate: true },
        query: { exists: { field: SERVICE_ENVIRONMENT } },
      });
    } else {
      filters.push({
        meta: { key: SERVICE_ENVIRONMENT, type: 'phrase', params: { query: environment } },
        query: { match_phrase: { [SERVICE_ENVIRONMENT]: environment } },
      });
    }
  }

  return filters;
}

function buildQueryFromKuery(kuery: string | undefined): Query | undefined {
  const trimmed = (kuery ?? '').trim();
  if (!trimmed) {
    return undefined;
  }
  return { query: trimmed, language: 'kuery' };
}

export const getServiceMapEmbeddableFactory = (deps: EmbeddableDeps) => {
  const factory: EmbeddablePublicDefinition<ServiceMapEmbeddableState, ServiceMapEmbeddableApi> = {
    type: APM_SERVICE_MAP_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const { coreStart } = deps;
      const state = initialState;

      const titleManager = initializeTitleManager(state);
      // Pass `time_range` through as-is — undefined when the user hasn't customized it.
      // The published `timeRange$` then emits undefined too, which makes Kibana's
      // `fetch$()` fall back to the dashboard's global time. When the built-in
      // "Customize time range" panel-menu action sets a value via `setTimeRange`, the
      // subject emits the new range and the panel uses it.
      const timeRangeManager = initializeTimeRangeManager({
        time_range: state.time_range,
      });

      const customStateManager = initializeStateManager<ServiceMapCustomState>(
        {
          environment: state.environment,
          kuery: state.kuery,
          service_name: state.service_name,
          service_group_id: state.service_group_id,
          map_orientation: state.map_orientation,
          sync_with_dashboard_filters: state.sync_with_dashboard_filters,
          alert_status_filter: state.alert_status_filter,
          slo_status_filter: state.slo_status_filter,
          connection_filter: state.connection_filter,
          anomaly_severity_filter: state.anomaly_severity_filter,
          find_query: state.find_query,
        },
        defaultCustomState
      );

      const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(
        buildQueryFromKuery(state.kuery)
      );
      const filters$ = new BehaviorSubject<Filter[] | undefined>(
        buildFiltersFromState(state.service_name, state.environment)
      );
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      const stateApi = initializeStateApi<ServiceMapEmbeddableState>({
        parentApi,
        uuid,
        serializeState: () => ({
          ...titleManager.getLatestState(),
          ...timeRangeManager.getLatestState(),
          ...customStateManager.getLatestState(),
        }),
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          timeRangeManager.anyStateChange$,
          customStateManager.anyStateChange$
        ).pipe(map(() => undefined)),
        getComparators: () => ({
          ...titleComparators,
          ...timeRangeComparators,
          ...customStateComparators,
        }),
        applySerializedState: (nextState) => {
          titleManager.reinitializeState(nextState);
          // Pass `time_range` through as-is; undefined keeps the panel inheriting
          // the dashboard's global time range.
          timeRangeManager.reinitializeState({ time_range: nextState.time_range });
          customStateManager.reinitializeState(nextState);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...timeRangeManager.api,
        ...stateApi,
        blockingError$,
        filters$,
        query$,
        canEditUnifiedSearch: () => true,
        getTypeDisplayName: () =>
          i18n.translate('xpack.apm.serviceMap.embeddable.typeDisplayName', {
            defaultMessage: 'configuration',
          }),
        isEditingEnabled: () => true,
        onEdit: async () => {
          openLazyFlyout({
            core: coreStart,
            parentApi,
            flyoutProps: {
              size: 'm',
              'data-test-subj': 'apmServiceMapEditorFlyout',
              focusedPanelId: uuid,
            },
            loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
              // Snapshot of the panel's state when the editor opens, used to revert any
              // live-preview changes if the flyout is closed without saving.
              const editorInitialState = stateApi.serializeState();
              // Push a full state onto the panel via the live setters so the map updates
              // immediately. Shared by the live preview (`onPreview`) and `onSave`.
              const applyCustomState = (newState: ServiceMapEmbeddableState) => {
                if (newState.environment !== undefined) {
                  customStateManager.api.setEnvironment(newState.environment);
                }
                customStateManager.api.setKuery(newState.kuery);
                customStateManager.api.setServiceName(newState.service_name);
                customStateManager.api.setMapOrientation(newState.map_orientation);
                customStateManager.api.setSyncWithDashboardFilters(
                  newState.sync_with_dashboard_filters
                );
                // View filters live in the edit flyout per product direction: the
                // in-graph options panel only renders layout controls in dashboard panels.
                customStateManager.api.setAlertStatusFilter(newState.alert_status_filter);
                customStateManager.api.setSloStatusFilter(newState.slo_status_filter);
                customStateManager.api.setConnectionFilter(newState.connection_filter);
                customStateManager.api.setAnomalySeverityFilter(newState.anomaly_severity_filter);
              };
              return (
                <ApmEmbeddableContext deps={deps}>
                  <ServiceMapEditorFlyout
                    ariaLabelledBy={ariaLabelledBy}
                    deps={deps}
                    timeRange={timeRangeManager.api.timeRange$.getValue()}
                    initialState={editorInitialState}
                    onCancel={closeFlyout}
                    // Preview-until-save: apply changes to the panel live while editing,
                    // and revert to the pre-edit snapshot if the flyout closes unsaved.
                    onPreview={applyCustomState}
                    onRevert={() => stateApi.applySerializedState(editorInitialState)}
                    onSave={(newState: ServiceMapEmbeddableState) => {
                      applyCustomState(newState);
                      closeFlyout();
                    }}
                  />
                </ApmEmbeddableContext>
              );
            },
          });
        },
      });

      return {
        api,
        Component: () => {
          useEffect(() => {
            const filtersSubscription = combineLatest([
              customStateManager.api.serviceName$,
              customStateManager.api.environment$,
            ]).subscribe(([sn, env]) => {
              filters$.next(buildFiltersFromState(sn, env));
            });
            const querySubscription = customStateManager.api.kuery$.subscribe((k) => {
              query$.next(buildQueryFromKuery(k));
            });
            return () => {
              filtersSubscription.unsubscribe();
              querySubscription.unsubscribe();
            };
          }, []);

          const [
            environment,
            kuery,
            serviceName,
            serviceGroupId,
            mapOrientation,
            syncWithDashboardFilters,
            alertStatusFilter,
            sloStatusFilter,
            connectionFilter,
            anomalySeverityFilter,
            findQuery,
          ] = useBatchedPublishingSubjects(
            customStateManager.api.environment$,
            customStateManager.api.kuery$,
            customStateManager.api.serviceName$,
            customStateManager.api.serviceGroupId$,
            customStateManager.api.mapOrientation$,
            customStateManager.api.syncWithDashboardFilters$,
            customStateManager.api.alertStatusFilter$,
            customStateManager.api.sloStatusFilter$,
            customStateManager.api.connectionFilter$,
            customStateManager.api.anomalySeverityFilter$,
            customStateManager.api.findQuery$
          );

          // Schema literals (`'critical' | 'major' | ...`) and the runtime enums consumed by
          // ServiceMapViewFilters share string values, so a single cast preserves the shape.
          const viewFilters = useMemo(
            () =>
              ({
                alertStatusFilter: alertStatusFilter ?? [],
                sloStatusFilter: sloStatusFilter ?? [],
                connectionFilter: connectionFilter ?? [],
                anomalySeverityFilter: anomalySeverityFilter ?? [],
              } as ServiceMapViewFilters),
            [alertStatusFilter, sloStatusFilter, connectionFilter, anomalySeverityFilter]
          );

          // Push in-panel edits back to the state manager so the controlled `viewFilters` /
          // `searchQuery` reflect changes; without these the chips/search would feel locked.
          // Empty arrays / empty strings are normalized to `undefined` so saved state stays tidy.
          const onViewFiltersChange = useCallback((next: ServiceMapViewFilters) => {
            customStateManager.api.setAlertStatusFilter(
              next.alertStatusFilter.length ? next.alertStatusFilter : undefined
            );
            customStateManager.api.setSloStatusFilter(
              next.sloStatusFilter.length ? next.sloStatusFilter : undefined
            );
            customStateManager.api.setConnectionFilter(
              next.connectionFilter.length ? next.connectionFilter : undefined
            );
            customStateManager.api.setAnomalySeverityFilter(
              next.anomalySeverityFilter.length ? next.anomalySeverityFilter : undefined
            );
          }, []);

          const onSearchQueryChange = useCallback((next: string) => {
            customStateManager.api.setFindQuery(next.trim() ? next : undefined);
          }, []);

          const fetchContext = useFetchContext(api);
          const effectiveTimeRange = fetchContext.timeRange ?? DEFAULT_TIME_RANGE;

          // Parent dashboard filters/query are merged into fetchContext by `useFetchContext`.
          // `sync_with_dashboard_filters` defaults false (panel uses only its own captured
          // filters). Forward parent filters only when the user opted in to syncing.
          const parentFilters = syncWithDashboardFilters ? fetchContext.filters : undefined;
          const parentQuery = syncWithDashboardFilters ? fetchContext.query : undefined;

          return (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <ApmEmbeddableContext
                deps={deps}
                rangeFrom={effectiveTimeRange.from}
                rangeTo={effectiveTimeRange.to}
                kuery={kuery}
              >
                <ServiceMapEmbeddable
                  rangeFrom={effectiveTimeRange.from}
                  rangeTo={effectiveTimeRange.to}
                  environment={environment}
                  kuery={kuery}
                  serviceName={serviceName ?? undefined}
                  serviceGroupId={serviceGroupId ?? undefined}
                  core={deps.coreStart}
                  onBlockingError={(error) => blockingError$.next(error)}
                  mapOrientation={mapOrientation ?? 'horizontal'}
                  onMapOrientationChange={customStateManager.api.setMapOrientation}
                  parentFilters={parentFilters}
                  parentQuery={parentQuery}
                  viewFilters={viewFilters}
                  onViewFiltersChange={onViewFiltersChange}
                  searchQuery={findQuery ?? undefined}
                  onSearchQueryChange={onSearchQueryChange}
                />
              </ApmEmbeddableContext>
            </div>
          );
        },
      };
    },
  };
  return factory;
};
