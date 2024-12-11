/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import React, { useEffect } from 'react';
import { DefaultEmbeddableApi, ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitles,
  useBatchedPublishingSubjects,
  fetch$,
  PublishesWritablePanelTitle,
  PublishesPanelTitle,
  SerializedTitles,
  HasEditCapabilities,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, Subject } from 'rxjs';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { MonitorFilters } from '../monitors_overview/types';
import { SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from '../constants';
import { ClientPluginsStart } from '../../../plugin';
import { StatsOverviewComponent } from './stats_overview_component';

export const getOverviewPanelTitle = () =>
  i18n.translate('xpack.synthetics.statusOverview.list.displayName', {
    defaultMessage: 'Synthetics Stats Overview',
  });

export type OverviewEmbeddableState = SerializedTitles & {
  filters: MonitorFilters;
};

export type StatsOverviewApi = DefaultEmbeddableApi<OverviewEmbeddableState> &
  PublishesWritablePanelTitle &
  PublishesPanelTitle &
  HasEditCapabilities;

export const getStatsOverviewEmbeddableFactory = (
  getStartServices: StartServicesAccessor<ClientPluginsStart>
) => {
  const factory: ReactEmbeddableFactory<
    OverviewEmbeddableState,
    OverviewEmbeddableState,
    StatsOverviewApi
  > = {
    type: SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
    deserializeState: (state) => {
      return state.rawState as OverviewEmbeddableState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const [coreStart, pluginStart] = await getStartServices();

      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
      const reload$ = new Subject<boolean>();
      const filters$ = new BehaviorSubject(state.filters);

      const api = buildApi(
        {
          ...titlesApi,
          defaultPanelTitle: defaultTitle$,
          getTypeDisplayName: () =>
            i18n.translate('xpack.synthetics.editSloOverviewEmbeddableTitle.typeDisplayName', {
              defaultMessage: 'filters',
            }),

          isEditingEnabled: () => true,
          onEdit: async () => {
            try {
              const { openMonitorConfiguration } = await import(
                '../common/monitors_open_configuration'
              );

              const result = await openMonitorConfiguration({
                coreStart,
                pluginStart,
                initialState: {
                  filters: filters$.getValue(),
                },
                title: i18n.translate('xpack.synthetics.editSloOverviewEmbeddableTitle.title', {
                  defaultMessage: 'Create monitor stats',
                }),
              });
              filters$.next(result.filters);
            } catch (e) {
              return Promise.reject();
            }
          },
          serializeState: () => {
            return {
              rawState: {
                ...serializeTitles(),
                filters: filters$.getValue(),
              },
            };
          },
        },
        {
          ...titleComparators,
          filters: [filters$, (value) => filters$.next(value)],
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
          const [filters] = useBatchedPublishingSubjects(filters$);

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
            };
          }, []);
          return (
            <div
              style={{
                width: '100%',
              }}
              data-shared-item="" // TODO: Remove data-shared-item and data-rendering-count as part of https://github.com/elastic/kibana/issues/179376
            >
              <StatsOverviewComponent reload$={reload$} filters={filters} />
            </div>
          );
        },
      };
    },
  };
  return factory;
};
