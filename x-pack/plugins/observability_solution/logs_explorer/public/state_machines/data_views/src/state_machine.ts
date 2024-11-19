/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { isError } from 'lodash';
import { assign, createMachine } from 'xstate';
import { createDefaultContext } from './defaults';
import type {
  DataViewsContext,
  DataViewsEvent,
  DataViewsTypestate,
  DefaultDataViewsContext,
} from './types';
import { loadDataViews, searchDataViews } from './services/data_views_service';

export function getSearchCacheKey(context: DataViewsContext) {
  return { search: context.search, filter: context.filter };
}

export const createPureDataViewsStateMachine = (
  initialContext: DefaultDataViewsContext = createDefaultContext()
) =>
  createMachine<DataViewsContext, DataViewsEvent, DataViewsTypestate>(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVA1AlmA7rAHQCuAdjhejqgDY4BekAxADIDyAgsgPrKcAVTjywBJAKIB1AMoBtAAwBdRKAAOAe1g5q6sipAAPRACYALMaIA2AIwB2awA5bAVgA0IAJ6JrzgMxFfeQdnAE5fFwBfCPc0TFwCYlp1VAhKKGYIXTAiSgA3dQBrbNjsPEIiJJS0hDz1AGMMHF0FRRb9DS0dPSRDRFNneSJnY1tfU3C3T29jEKJ5AdsHa2NnKJiMUoSK5NSydLAAJwP1A6JVWgwAMxOAWyIS+PLK3agasnyGrpa2no7tJu6oCMCDMzjmIzGE3cXgQYwcREcvlCEzWIAeZUSO0gOQgtDAzGk4k4ACUAMIACT4gmEYikciU7U0-10+mBIUWCPkPksK2hiF8jiIDmF8mMQV8EsltlR6K2z2xOFx+Ok7GJAipQhEEhkPzUTK6rMQliWRFsIWNLj5IIcFnGpgcIWcDklUplG0emJSCqVBPErHEpPV-E1tMkupAfwNPWBtntRBC5vkYUtUwQ1iTCNM1hCI3FLul0TR7ox2y9ECIEDAACN1OQ6mBpGBUAc6gALNKywi+kkUjU07X05S-fUAw1piGmxwpmG+EZWZzprOWZcryy+N1xEvy8uVmt1htNlvtvad2DMAywTDobKoS7Xg4ACkC8gAlMxT6XKzvq7WyPXG82bYdsWCThpGo7RogITCkKITyDykwwsY1j+KMljsiE1irsu66Fh+zxpAAYqgOB4hAzDEn6XC8MG-Z0mBI4spBCDjNYRArL4cEIVapguPGLjGJY8hLiuBaFmQ6iVvAPSnoynQQUC3g2kK4zTogAC0lhgsEDjyLYMxYauuHrJuWzkJQ-x0IwkBycygK9CCQmmksvKpsEQwbpsTw7GktlRopIKBCpUKpsYxj+OmopCSJK4hJ5HqfjZw7yUxAVrqh5pOIhJhsZYWY5rYeaunhIHeWWOJ4n5CkOcEpimuhfjLNlIJzpx2a5s6+bxVuWLfnuf4HoBx5QLJyV2WO1iIqaphCcmzXIWx9hIjFRndXKPl7MRpFJXqKX2cCZh1YJzjcam5i2EQ9qqasUQREAA */
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DataViews',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          on: {
            LOAD_DATA_VIEWS: 'loading',
          },
        },
        loading: {
          id: 'loading',
          invoke: {
            src: 'loadDataViews',
            onDone: {
              target: 'loaded',
              actions: ['storeInCache', 'storeDataViews', 'storeSearch'],
            },
            onError: 'loadingFailed',
          },
        },
        loaded: {
          id: 'loaded',
          initial: 'idle',
          states: {
            idle: {
              on: {
                SEARCH_DATA_VIEWS: 'debounceSearchingDataViews',
                SORT_DATA_VIEWS: {
                  actions: ['storeSearch', 'searchDataViews'],
                },
                FILTER_DATA_VIEWS: {
                  actions: ['storeFilter', 'searchDataViews'],
                },
                SELECT_DATA_VIEW: {
                  actions: ['navigateToDiscoverDataView'],
                },
              },
            },
            debounceSearchingDataViews: {
              entry: 'storeSearch',
              on: {
                SEARCH_DATA_VIEWS: 'debounceSearchingDataViews',
              },
              after: {
                300: {
                  target: 'idle',
                  actions: 'searchDataViews',
                },
              },
            },
          },
        },
        loadingFailed: {
          entry: ['clearCache', 'clearData', 'storeError'],
          exit: 'clearError',
          on: {
            RELOAD_DATA_VIEWS: 'loading',
          },
        },
      },
    },
    {
      actions: {
        storeSearch: assign((_context, event) => ({
          // Store search from search event
          ...('search' in event && { search: event.search }),
        })),
        storeFilter: assign((_context, event) => ({
          ...('filter' in event && { filter: event.filter }),
        })),
        storeDataViews: assign((_context, event) =>
          'data' in event && !isError(event.data)
            ? { dataViewsSource: event.data, dataViews: event.data }
            : {}
        ),
        searchDataViews: assign((context) => {
          if (context.dataViewsSource !== null) {
            return {
              dataViews: searchDataViews(context.dataViewsSource, {
                search: context.search,
                filter: context.filter,
              }),
            };
          }
          return {};
        }),
        storeInCache: (context, event) => {
          if ('data' in event && !isError(event.data)) {
            context.cache.set(getSearchCacheKey(context), event.data);
          }
        },
        storeError: assign((_context, event) =>
          'data' in event && isError(event.data) ? { error: event.data } : {}
        ),
        clearCache: (context) => {
          context.cache.reset();
        },
        clearData: assign((_context) => ({ dataViews: null })),
        clearError: assign((_context) => ({ error: null })),
      },
    }
  );

export interface DataViewsStateMachineDependencies {
  initialContext?: DefaultDataViewsContext;
  dataViews: DataViewsPublicPluginStart;
}

export const createDataViewsStateMachine = ({
  initialContext,
  dataViews,
}: DataViewsStateMachineDependencies) =>
  createPureDataViewsStateMachine(initialContext).withConfig({
    services: {
      loadDataViews: loadDataViews({ dataViews }),
    },
  });
