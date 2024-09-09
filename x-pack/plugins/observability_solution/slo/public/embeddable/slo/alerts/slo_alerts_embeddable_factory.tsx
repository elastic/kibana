/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { Router } from '@kbn/shared-ux-router';
import { BehaviorSubject, Subject } from 'rxjs';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitles,
  useBatchedPublishingSubjects,
  fetch$,
  FetchContext,
  useFetchContext,
} from '@kbn/presentation-publishing';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserHistory } from 'history';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { SLO_ALERTS_EMBEDDABLE_ID } from './constants';
import { SloAlertsEmbeddableState, SloAlertsApi } from './types';
import { SloPublicPluginsStart, SloPublicStart } from '../../../types';
import { SloAlertsWrapper } from './slo_alerts_wrapper';
const history = createBrowserHistory();
const queryClient = new QueryClient();

export const getAlertsPanelTitle = () =>
  i18n.translate('xpack.slo.sloAlertsEmbeddable.displayTitle', {
    defaultMessage: 'SLO Alerts',
  });

export function getAlertsEmbeddableFactory(
  getStartServices: StartServicesAccessor<SloPublicPluginsStart, SloPublicStart>,
  kibanaVersion: string
) {
  const factory: ReactEmbeddableFactory<
    SloAlertsEmbeddableState,
    SloAlertsEmbeddableState,
    SloAlertsApi
  > = {
    type: SLO_ALERTS_EMBEDDABLE_ID,
    deserializeState: (state) => {
      return state.rawState as SloAlertsEmbeddableState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const [coreStart, pluginStart] = await getStartServices();
      const deps = { ...coreStart, ...pluginStart };
      async function onEdit() {
        try {
          const { openSloConfiguration } = await import('./slo_alerts_open_configuration');

          const result = await openSloConfiguration(
            coreStart,
            pluginStart,
            api.getSloAlertsConfig()
          );
          api.updateSloAlertsConfig(result);
        } catch (e) {
          return Promise.reject();
        }
      }

      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getAlertsPanelTitle());
      const slos$ = new BehaviorSubject(state.slos);
      const showAllGroupByInstances$ = new BehaviorSubject(state.showAllGroupByInstances);
      const reload$ = new Subject<FetchContext>();
      const api = buildApi(
        {
          ...titlesApi,
          defaultPanelTitle: defaultTitle$,
          getTypeDisplayName: () =>
            i18n.translate('xpack.slo.editSloAlertswEmbeddable.typeDisplayName', {
              defaultMessage: 'configuration',
            }),
          isEditingEnabled: () => true,
          onEdit: async () => {
            onEdit();
          },
          serializeState: () => {
            return {
              rawState: {
                ...serializeTitles(),
                slos: slos$.getValue(),
                showAllGroupByInstances: showAllGroupByInstances$.getValue(),
              },
            };
          },
          getSloAlertsConfig: () => {
            return {
              slos: slos$.getValue(),
              showAllGroupByInstances: showAllGroupByInstances$.getValue(),
            };
          },
          updateSloAlertsConfig: (update) => {
            slos$.next(update.slos);
            showAllGroupByInstances$.next(update.showAllGroupByInstances);
          },
        },
        {
          slos: [slos$, (value) => slos$.next(value)],
          showAllGroupByInstances: [
            showAllGroupByInstances$,
            (value) => showAllGroupByInstances$.next(value),
          ],
          ...titleComparators,
        }
      );

      const fetchSubscription = fetch$(api)
        .pipe()
        .subscribe((next) => {
          reload$.next(next);
        });

      return {
        api,
        Component: () => {
          const [slos, showAllGroupByInstances] = useBatchedPublishingSubjects(
            slos$,
            showAllGroupByInstances$
          );
          const fetchContext = useFetchContext(api);
          const I18nContext = deps.i18n.Context;

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
            };
          }, []);
          return (
            <I18nContext>
              <KibanaContextProvider
                services={{
                  ...deps,
                  storage: new Storage(localStorage),
                  isServerless: !!deps.serverless,
                  kibanaVersion,
                }}
              >
                <Router history={history}>
                  <QueryClientProvider client={queryClient}>
                    <SloAlertsWrapper
                      onEdit={onEdit}
                      deps={deps}
                      slos={slos}
                      timeRange={fetchContext.timeRange ?? { from: 'now-15m/m', to: 'now' }}
                      reloadSubject={reload$}
                      showAllGroupByInstances={showAllGroupByInstances}
                    />
                  </QueryClientProvider>
                </Router>
              </KibanaContextProvider>
            </I18nContext>
          );
        },
      };
    },
  };

  return factory;
}
