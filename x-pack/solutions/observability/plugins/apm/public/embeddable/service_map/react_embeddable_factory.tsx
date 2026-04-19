/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type {
  HasEditCapabilities,
  PublishesBlockingError,
  PublishesFilters,
  PublishesTimeRange,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import {
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-publishing';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { openLazyFlyout } from '@kbn/presentation-util';
import { BehaviorSubject, combineLatest, map, merge } from 'rxjs';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '@kbn/apm-types';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../common/environment_filter_values';

import type { EmbeddableDeps } from '../types';
import type { ServiceMapEmbeddableState } from './types';
import { ApmEmbeddableContext } from '../embeddable_context';
import { ServiceMapEmbeddable } from './service_map_embeddable';
import { ServiceMapEditorFlyout } from './service_map_editor_flyout';
import { APM_SERVICE_MAP_EMBEDDABLE } from './constants';

const DEFAULT_RANGE_FROM = 'now-15m';
const DEFAULT_RANGE_TO = 'now';

export type ServiceMapEmbeddableApi = DefaultEmbeddableApi<ServiceMapEmbeddableState> &
  HasEditCapabilities &
  PublishesBlockingError &
  PublishesFilters &
  PublishesTimeRange & {
    setTimeRange: (timeRange: TimeRange | undefined) => void;
    query$: PublishingSubject<Query | undefined>;
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

function buildQueryFromKuery(kuery: string): Query | undefined {
  const trimmed = kuery.trim();
  if (!trimmed) {
    return undefined;
  }
  return { query: trimmed, language: 'kuery' };
}

export const getServiceMapEmbeddableFactory = (deps: EmbeddableDeps) => {
  const factory: EmbeddableFactory<ServiceMapEmbeddableState, ServiceMapEmbeddableApi> = {
    type: APM_SERVICE_MAP_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const { coreStart } = deps;
      const state = initialState;
      const titleManager = initializeTitleManager(state);
      const rangeFrom$ = new BehaviorSubject(state.rangeFrom ?? DEFAULT_RANGE_FROM);
      const rangeTo$ = new BehaviorSubject(state.rangeTo ?? DEFAULT_RANGE_TO);
      const environment$ = new BehaviorSubject(state.environment ?? ENVIRONMENT_ALL.value);
      const kuery$ = new BehaviorSubject(state.kuery ?? '');
      const serviceName$ = new BehaviorSubject(state.serviceName);
      const serviceGroupId$ = new BehaviorSubject(state.serviceGroupId);

      const query$ = new BehaviorSubject<Query | undefined>(buildQueryFromKuery(state.kuery ?? ''));
      const filters$ = new BehaviorSubject<Filter[] | undefined>(
        buildFiltersFromState(state.serviceName, state.environment)
      );
      const timeRange$ = new BehaviorSubject<TimeRange | undefined>({
        from: rangeFrom$.getValue(),
        to: rangeTo$.getValue(),
      });
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      combineLatest([serviceName$, environment$]).subscribe(([sn, env]) => {
        filters$.next(buildFiltersFromState(sn, env));
      });
      kuery$.subscribe((k) => {
        query$.next(buildQueryFromKuery(k));
      });
      combineLatest([rangeFrom$, rangeTo$]).subscribe(([from, to]) => {
        timeRange$.next({ from, to });
      });

      function serializeState(): ServiceMapEmbeddableState {
        return {
          ...titleManager.getLatestState(),
          rangeFrom: rangeFrom$.getValue(),
          rangeTo: rangeTo$.getValue(),
          environment: environment$.getValue(),
          kuery: kuery$.getValue(),
          serviceName: serviceName$.getValue(),
          serviceGroupId: serviceGroupId$.getValue(),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges({
        parentApi,
        uuid,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          rangeFrom$,
          rangeTo$,
          environment$,
          kuery$,
          serviceName$,
          serviceGroupId$
        ).pipe(map(() => undefined)),
        getComparators: () => ({
          ...titleComparators,
          rangeFrom: 'referenceEquality',
          rangeTo: 'referenceEquality',
          environment: 'referenceEquality',
          kuery: 'referenceEquality',
          serviceName: 'referenceEquality',
          serviceGroupId: 'referenceEquality',
        }),
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved);
          rangeFrom$.next(lastSaved?.rangeFrom ?? DEFAULT_RANGE_FROM);
          rangeTo$.next(lastSaved?.rangeTo ?? DEFAULT_RANGE_TO);
          environment$.next(lastSaved?.environment ?? ENVIRONMENT_ALL.value);
          kuery$.next(lastSaved?.kuery ?? '');
          serviceName$.next(lastSaved?.serviceName);
          serviceGroupId$.next(lastSaved?.serviceGroupId);
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...unsavedChangesApi,
        serializeState,
        blockingError$,
        filters$,
        query$,
        timeRange$,
        setTimeRange: (timeRange: TimeRange | undefined) => {
          rangeFrom$.next(timeRange?.from ?? DEFAULT_RANGE_FROM);
          rangeTo$.next(timeRange?.to ?? DEFAULT_RANGE_TO);
        },
        canEditUnifiedSearch: () => true,
        getTypeDisplayName: () =>
          i18n.translate('xpack.apm.embeddable.serviceMap.typeDisplayName', {
            defaultMessage: 'configuration',
          }),
        isEditingEnabled: () => true,
        onEdit: async () => {
          openLazyFlyout({
            core: coreStart,
            parentApi,
            flyoutProps: {
              type: 'overlay',
              size: 'm',
              container: null,
              'data-test-subj': 'apmServiceMapEditorFlyout',
              focusedPanelId: uuid,
            },
            loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
              return (
                <ApmEmbeddableContext deps={deps}>
                  <ServiceMapEditorFlyout
                    ariaLabelledBy={ariaLabelledBy}
                    deps={deps}
                    timeRange={timeRange$.getValue()}
                    initialState={serializeState()}
                    onCancel={closeFlyout}
                    onSave={(newState: ServiceMapEmbeddableState) => {
                      if (newState.environment !== undefined) {
                        environment$.next(newState.environment);
                      }
                      if (newState.kuery !== undefined) {
                        kuery$.next(newState.kuery);
                      }
                      serviceName$.next(newState.serviceName);
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
          const [rangeFrom, rangeTo, environment, kuery, serviceName, serviceGroupId] =
            useBatchedPublishingSubjects(
              rangeFrom$,
              rangeTo$,
              environment$,
              kuery$,
              serviceName$,
              serviceGroupId$
            );

          return (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <ApmEmbeddableContext
                deps={deps}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                kuery={kuery}
              >
                <ServiceMapEmbeddable
                  rangeFrom={rangeFrom}
                  rangeTo={rangeTo}
                  environment={environment}
                  kuery={kuery}
                  serviceName={serviceName ?? undefined}
                  serviceGroupId={serviceGroupId ?? undefined}
                  core={deps.coreStart}
                  onBlockingError={(error) => blockingError$.next(error)}
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
