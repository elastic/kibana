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
import { SLO_ERROR_BUDGET_ID } from './constants';
import { SloErrorBudgetEmbeddableState, SloEmbeddableDeps, ErrorBudgetApi } from './types';
import { SloErrorBudget } from './error_budget_burn_down';

export const getErrorBudgetPanelTitle = () =>
  i18n.translate('xpack.slo.errorBudgetEmbeddable.title', {
    defaultMessage: 'SLO Error Budget burn down',
  });
const queryClient = new QueryClient();

export const getErrorBudgetEmbeddableFactory = (deps: SloEmbeddableDeps) => {
  const factory: ReactEmbeddableFactory<
    SloErrorBudgetEmbeddableState,
    SloErrorBudgetEmbeddableState,
    ErrorBudgetApi
  > = {
    type: SLO_ERROR_BUDGET_ID,
    deserializeState: (state) => {
      return state.rawState as SloErrorBudgetEmbeddableState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getErrorBudgetPanelTitle());
      const sloId$ = new BehaviorSubject(state.sloId);
      const sloInstanceId$ = new BehaviorSubject(state.sloInstanceId);
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
              },
            };
          },
        },
        {
          sloId: [sloId$, (value) => sloId$.next(value)],
          sloInstanceId: [sloInstanceId$, (value) => sloInstanceId$.next(value)],
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
          const [sloId, sloInstanceId] = useBatchedPublishingSubjects(sloId$, sloInstanceId$);

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
                    <SloErrorBudget
                      sloId={sloId}
                      sloInstanceId={sloInstanceId}
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
