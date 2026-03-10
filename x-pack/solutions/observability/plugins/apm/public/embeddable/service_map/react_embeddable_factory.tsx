/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  apiPublishesUnifiedSearch,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-publishing';
import useObservable from 'react-use/lib/useObservable';
import type { Query } from '@kbn/es-query';
import { BehaviorSubject, map, merge } from 'rxjs';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';

const NO_QUERY$ = new BehaviorSubject<Query | undefined>(undefined);
import type { EmbeddableDeps } from '../types';
import type { ServiceMapEmbeddableState } from './types';
import { ApmEmbeddableContext } from '../embeddable_context';
import { ServiceMapEmbeddable } from './service_map_embeddable';
import { APM_SERVICE_MAP_EMBEDDABLE } from './constants';

const DEFAULT_RANGE_FROM = 'now-15m';
const DEFAULT_RANGE_TO = 'now';

export const getServiceMapEmbeddableFactory = (deps: EmbeddableDeps) => {
  const factory: EmbeddableFactory<
    ServiceMapEmbeddableState,
    DefaultEmbeddableApi<ServiceMapEmbeddableState>
  > = {
    type: APM_SERVICE_MAP_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState;
      const titleManager = initializeTitleManager(state);
      const rangeFrom$ = new BehaviorSubject(state.rangeFrom ?? DEFAULT_RANGE_FROM);
      const rangeTo$ = new BehaviorSubject(state.rangeTo ?? DEFAULT_RANGE_TO);
      const environment$ = new BehaviorSubject(state.environment ?? ENVIRONMENT_ALL.value);
      const kuery$ = new BehaviorSubject(state.kuery ?? '');
      const serviceName$ = new BehaviorSubject(state.serviceName);
      const serviceGroupId$ = new BehaviorSubject(state.serviceGroupId);

      function serializeState() {
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

          const parentQuery$ = apiPublishesUnifiedSearch(parentApi) ? parentApi.query$ : NO_QUERY$;
          const dashboardQuery = useObservable(parentQuery$);
          const effectiveKuery = useMemo(() => {
            const dashboardQueryString =
              dashboardQuery && typeof dashboardQuery === 'object' && 'query' in dashboardQuery
                ? String((dashboardQuery as { query?: string }).query ?? '').trim()
                : '';
            const panelKuery = (kuery ?? '').trim();
            if (dashboardQueryString) {
              return panelKuery
                ? `${panelKuery} and ${dashboardQueryString}`
                : dashboardQueryString;
            }
            return panelKuery;
          }, [dashboardQuery, kuery]);

          return (
            <ApmEmbeddableContext
              deps={deps}
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              kuery={effectiveKuery}
            >
              <ServiceMapEmbeddable
                rangeFrom={rangeFrom ?? DEFAULT_RANGE_FROM}
                rangeTo={rangeTo ?? DEFAULT_RANGE_TO}
                environment={environment}
                kuery={effectiveKuery}
                serviceName={serviceName ?? undefined}
                serviceGroupId={serviceGroupId ?? undefined}
                core={deps.coreStart}
              />
            </ApmEmbeddableContext>
          );
        },
      };
    },
  };
  return factory;
};
