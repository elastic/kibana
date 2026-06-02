/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
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
  // Default ON: the panel uses only its own captured filters and ignores the
  // dashboard's KQL/Controls. Dashboards usually have broader filter contexts
  // that don't make sense for a service map.
  apply_custom_filters: true,
  // Default OFF: panel inherits the dashboard's global time range. When ON, the
  // panel's stored `time_range` (set via the built-in "Customize time range"
  // panel-menu action) is published instead.
  apply_custom_time_range: false,
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
  apply_custom_filters: 'referenceEquality',
  apply_custom_time_range: 'referenceEquality',
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
      // Always keep the stored time range available so the built-in "Customize time range"
      // panel-menu action works; whether it's actually *applied* to the data fetch is
      // gated below by `apply_custom_time_range` via the derived `effectiveTimeRange$`.
      const timeRangeManager = initializeTimeRangeManager({
        time_range: state.time_range ?? DEFAULT_TIME_RANGE,
      });

      const customStateManager = initializeStateManager<ServiceMapCustomState>(
        {
          environment: state.environment,
          kuery: state.kuery,
          service_name: state.service_name,
          service_group_id: state.service_group_id,
          map_orientation: state.map_orientation,
          apply_custom_filters: state.apply_custom_filters,
          apply_custom_time_range: state.apply_custom_time_range,
          alert_status_filter: state.alert_status_filter,
          slo_status_filter: state.slo_status_filter,
          connection_filter: state.connection_filter,
          anomaly_severity_filter: state.anomaly_severity_filter,
          find_query: state.find_query,
        },
        defaultCustomState
      );

      // Published time range: emit the stored value only when the user opted into a
      // custom time range. Otherwise emit `undefined` so `fetch$()` falls back to the
      // dashboard's global time range (see presentation-publishing fetch.ts).
      const effectiveTimeRange$ = new BehaviorSubject<TimeRange | undefined>(
        state.apply_custom_time_range ? timeRangeManager.api.timeRange$.getValue() : undefined
      );
      // Subscription is bounded by the embeddable instance lifetime — matches the
      // existing pattern for `query$` / `filters$` BehaviorSubjects in this file.
      combineLatest([
        customStateManager.api.applyCustomTimeRange$,
        timeRangeManager.api.timeRange$,
      ])
        .pipe(map(([on, tr]) => (on ? tr : undefined)))
        .subscribe((next) => effectiveTimeRange$.next(next));

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
          timeRangeManager.reinitializeState(
            nextState.time_range
              ? { time_range: nextState.time_range }
              : { time_range: DEFAULT_TIME_RANGE }
          );
          customStateManager.reinitializeState(nextState);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...timeRangeManager.api,
        // Override the timeRange$ exposed by `timeRangeManager.api` with the gated
        // `effectiveTimeRange$` so the dashboard sees `undefined` when the user hasn't
        // opted into a panel-level custom time range. `setTimeRange` from
        // `timeRangeManager.api` still writes to the manager unchanged, so the dashboard's
        // built-in "Customize time range" panel-menu action keeps working.
        timeRange$: effectiveTimeRange$,
        ...stateApi,
        blockingError$,
        filters$,
        query$,
        canEditUnifiedSearch: () => true,
        getTypeDisplayName: () => 'configuration',
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
              return (
                <ApmEmbeddableContext deps={deps}>
                  <ServiceMapEditorFlyout
                    ariaLabelledBy={ariaLabelledBy}
                    deps={deps}
                    timeRange={timeRangeManager.api.timeRange$.getValue()}
                    initialState={stateApi.serializeState()}
                    onCancel={closeFlyout}
                    onSave={(newState: ServiceMapEmbeddableState) => {
                      if (newState.environment !== undefined) {
                        customStateManager.api.setEnvironment(newState.environment);
                      }
                      customStateManager.api.setKuery(newState.kuery);
                      customStateManager.api.setServiceName(newState.service_name);
                      customStateManager.api.setMapOrientation(newState.map_orientation);
                      customStateManager.api.setApplyCustomFilters(newState.apply_custom_filters);
                      customStateManager.api.setApplyCustomTimeRange(
                        newState.apply_custom_time_range
                      );
                      // View filters live in the edit flyout per product direction: the
                      // in-graph options panel only renders layout controls in dashboard panels.
                      customStateManager.api.setAlertStatusFilter(newState.alert_status_filter);
                      customStateManager.api.setSloStatusFilter(newState.slo_status_filter);
                      customStateManager.api.setConnectionFilter(newState.connection_filter);
                      customStateManager.api.setAnomalySeverityFilter(
                        newState.anomaly_severity_filter
                      );
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
            applyCustomFilters,
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
            customStateManager.api.applyCustomFilters$,
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
          // `apply_custom_filters` defaults true (panel uses only its own captured filters).
          // Forward parent filters only when the user opted out of custom filters.
          const parentFilters = !applyCustomFilters ? fetchContext.filters : undefined;
          const parentQuery = !applyCustomFilters ? fetchContext.query : undefined;

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
