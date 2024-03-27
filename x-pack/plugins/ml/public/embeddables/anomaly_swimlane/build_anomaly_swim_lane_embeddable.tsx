/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeReactEmbeddableTitles } from '@kbn/embeddable-plugin/public';
import type {
  EmbeddableStateComparators,
  ReactEmbeddableApiRegistration,
} from '@kbn/embeddable-plugin/public/react_embeddable_system/types';
import type { TimeRange } from '@kbn/es-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import fastIsEqual from 'fast-deep-equal';
import React, { Suspense, useEffect } from 'react';
import { BehaviorSubject, Subscription } from 'rxjs';
import type { AnomalySwimlaneEmbeddableServices, AnomalySwimlaneEmbeddableUserInput } from '..';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';
import { SWIM_LANE_DEFAULT_PAGE_SIZE } from '../../application/explorer/explorer_constants';
import type { JobId } from '../../shared';
import { buildDataViewPublishingApi } from '../common/anomaly_detection_embeddable';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';
import EmbeddableSwimLaneContainer from './embeddable_swim_lane_container';
import type { AnomalySwimLaneEmbeddableApi, AnomalySwimLaneEmbeddableState } from './types';

export const buildAnomalySwimLaneEmbeddable = async (
  state: AnomalySwimLaneEmbeddableState,
  buildApi: (
    apiRegistration: ReactEmbeddableApiRegistration<
      AnomalySwimLaneEmbeddableState,
      AnomalySwimLaneEmbeddableApi
    >,
    comparators: EmbeddableStateComparators<AnomalySwimLaneEmbeddableState>
  ) => AnomalySwimLaneEmbeddableApi,
  services: AnomalySwimlaneEmbeddableServices
) => {
  const subscriptions = new Subscription();

  const jobIds = new BehaviorSubject<JobId[]>(state.jobIds);
  const swimlaneType = new BehaviorSubject<SwimlaneType>(state.swimlaneType);
  const viewBy = new BehaviorSubject<string | undefined>(state.viewBy);
  const fromPage = new BehaviorSubject<number>(1);
  const perPage = new BehaviorSubject<number>(state.perPage ?? SWIM_LANE_DEFAULT_PAGE_SIZE);
  const interval = new BehaviorSubject<number | undefined>(undefined);

  const { titlesApi, titleComparators, serializeTitles } = initializeReactEmbeddableTitles(state);

  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(state.timeRange);
  function setTimeRange(nextTimeRange: TimeRange | undefined) {
    timeRange$.next(nextTimeRange);
  }

  const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);

  const api = buildApi(
    {
      ...titlesApi,
      jobIds,
      swimlaneType,
      viewBy,
      fromPage,
      perPage,
      interval,
      setInterval: (v) => interval.next(v),
      updateUserInput: (update: AnomalySwimlaneEmbeddableUserInput) => {
        jobIds.next(update.jobIds);
        swimlaneType.next(update.swimlaneType);
        viewBy.next(update.viewBy);
        titlesApi.setPanelTitle(update.panelTitle);
      },
      updatePagination: (update: { perPage?: number; fromPage: number }) => {
        fromPage.next(update.fromPage);
        if (update.perPage) {
          perPage.next(update.perPage);
        }
      },
      dataViews: buildDataViewPublishingApi(
        {
          anomalyDetectorService: services[2].anomalyDetectorService,
          dataViewsService: services[1].data.dataViews,
        },
        { jobIds },
        subscriptions
      ),
      timeRange$,
      setTimeRange,
      dataLoading: dataLoading$,
      serializeState: () => {
        return {
          rawState: {
            ...serializeTitles(),
            jobIds: jobIds.value,
            swimlaneType: swimlaneType.value,
            viewBy: viewBy.value,
            perPage: perPage.value,
            timeRange: timeRange$.value,
          },

          references: [],
        };
      },
    },
    {
      timeRange: [timeRange$, setTimeRange, fastIsEqual],
      ...titleComparators,
      jobIds: [jobIds, jobIds.next, fastIsEqual],
      swimlaneType: [swimlaneType, swimlaneType.next],
      viewBy: [viewBy, viewBy.next],
      // We do not want to store the current page
      fromPage: [fromPage, fromPage.next, () => true],
      perPage: [perPage, perPage.next],
    }
  );

  const appliedTimeRange$ = new BehaviorSubject(
    timeRange$.value ?? api.parentApi?.timeRange$?.value
  );
  subscriptions.add(
    api.timeRange$.subscribe((timeRange) => {
      appliedTimeRange$.next(timeRange ?? api.parentApi?.timeRange$?.value);
    })
  );
  if (api.parentApi?.timeRange$) {
    subscriptions.add(
      api.parentApi?.timeRange$.subscribe((parentTimeRange) => {
        if (timeRange$?.value) {
          return;
        }
        appliedTimeRange$.next(parentTimeRange);
      })
    );
  }
  api.appliedTimeRange$ = appliedTimeRange$;

  const onError = () => {
    dataLoading$.next(false);
  };

  const onLoading = () => {
    dataLoading$.next(true);
  };

  const refresh$ = new BehaviorSubject<void>(undefined);

  const onRenderComplete = () => {};

  return {
    api,
    Component: () => {
      const I18nContext = services[0].i18n.Context;
      const theme = services[0].theme;

      useEffect(function onUnmount() {
        return () => {
          subscriptions.unsubscribe();
        };
      }, []);

      return (
        <I18nContext>
          <KibanaThemeProvider theme={theme}>
            <KibanaContextProvider services={{ ...services[0] }}>
              <Suspense fallback={<EmbeddableLoading />}>
                <EmbeddableSwimLaneContainer
                  api={api}
                  id={api.uuid}
                  services={services}
                  refresh={refresh$}
                  onRenderComplete={onRenderComplete}
                  onLoading={onLoading}
                  onError={onError}
                />
              </Suspense>
            </KibanaContextProvider>
          </KibanaThemeProvider>
        </I18nContext>
      );
    },
  };
};
