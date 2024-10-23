/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createBrowserHistory } from 'history';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitles,
  useBatchedPublishingSubjects,
  fetch$,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, Subject } from 'rxjs';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SLO_BURN_RATE_EMBEDDABLE_ID } from './constants';
import { SloBurnRateEmbeddableState, SloEmbeddableDeps, BurnRateApi } from './types';
import { BurnRate } from './burn_rate';

export const getTitle = () =>
  i18n.translate('xpack.slo.burnRateEmbeddable.title', {
    defaultMessage: 'SLO Burn Rate',
  });

const queryClient = new QueryClient();

export const getBurnRateEmbeddableFactory = (deps: SloEmbeddableDeps) => {
  const factory: ReactEmbeddableFactory<
    SloBurnRateEmbeddableState,
    SloBurnRateEmbeddableState,
    BurnRateApi
  > = {
    type: SLO_BURN_RATE_EMBEDDABLE_ID,
    deserializeState: (state) => {
      return state.rawState as SloBurnRateEmbeddableState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getTitle());
      const sloId$ = new BehaviorSubject(state.sloId);
      const sloInstanceId$ = new BehaviorSubject(state.sloInstanceId);
      const duration$ = new BehaviorSubject(state.duration);
      const reload$ = new Subject<boolean>();

      const api = buildApi(
        {
          ...titlesApi,
          defaultPanelTitle: defaultTitle$,
          serializeState: () => {
            return {
              rawState: {
                ...serializeTitles(),
                sloId: sloId$.getValue(),
                sloInstanceId: sloInstanceId$.getValue(),
                duration: duration$.getValue(),
              },
            };
          },
        },
        {
          sloId: [sloId$, (value) => sloId$.next(value)],
          sloInstanceId: [sloInstanceId$, (value) => sloInstanceId$.next(value)],
          duration: [duration$, (value) => duration$.next(value)],
          ...titleComparators,
        }
      );

      const fetchSubscription = fetch$(api)
        .pipe()
        .subscribe((next) => {
          reload$.next(next.isReload);
        });

      return {
        api,
        Component: () => {
          const [sloId, sloInstanceId, duration] = useBatchedPublishingSubjects(
            sloId$,
            sloInstanceId$,
            duration$
          );

          const I18nContext = deps.i18n.Context;

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
            };
          }, []);

          return (
            <I18nContext>
              <Router history={createBrowserHistory()}>
                <KibanaContextProvider services={deps}>
                  <QueryClientProvider client={queryClient}>
                    <BurnRate
                      sloId={sloId}
                      sloInstanceId={sloInstanceId}
                      duration={duration}
                      reloadSubject={reload$}
                    />
                  </QueryClientProvider>
                </KibanaContextProvider>
              </Router>
            </I18nContext>
          );
        },
      };
    },
  };
  return factory;
};
