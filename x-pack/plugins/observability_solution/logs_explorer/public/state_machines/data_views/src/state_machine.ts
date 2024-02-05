/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { isError } from 'lodash';
import { assign, createMachine } from 'xstate';
import { DataViewDescriptor } from '../../../../common/data_views/models/data_view_descriptor';
import { createComparatorByField } from '../../../utils/comparator_by_field';
import { createDefaultContext } from './defaults';
import type {
  DataViewsContext,
  DataViewsEvent,
  DataViewsSearchParams,
  DataViewsTypestate,
  DefaultDataViewsContext,
} from './types';

export const createPureDataViewsStateMachine = (
  initialContext: DefaultDataViewsContext = createDefaultContext()
) =>
  createMachine<DataViewsContext, DataViewsEvent, DataViewsTypestate>(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVA1AlmA7rAHQCuAdjhejqgDY4BekAxADIDyAgsgPrKcAVTjywBJAKIB1AMoBtAAwBdRKAAOAe1g5q6sipAAPRAEYAHAGYip4wCYArABoQAT0Q2AbABYidgL6+nNExcAmJadVQISihmCF0wIkoAN3UAawSg7DxCInDI6IRk9QBjDBxdBUVK-Q0tHT0kQ0Q7GydXBHc7dyIbAE5jd0Gh4f9AjCzQ3IioshiwACd59XmiVVoMADNlgFsiTJCcvJmoQrIU0vrK6sba7XKG0CMEG08bIl6bMwB2RxcTMx8FnMwJBoM8oxA+2yYWmkESEFoYGY0nEnAASgBhAASfEEwjEUjkShqmjuun0Txa3Xk5l68nc9jaiFMNi+71eX3kQNB5ghUMmRzhOARSOk7DRAlxQhEEhk1zUpPqFMQ5nk3msjL+HX67zs5lsfgCkPGBxhkSFIuR4lY4gxkv40oJknlIFuSsaTxsLKIX3MnnMPyZCDsvTsPj5JuhU3NECIEDAACN1ORimBpGBUPNigALaL8whW9HYqX42VE5Q3RX3ZUIL6meREcx2YxdTXtH7Gdmsrk84ER4JRwWx+NJlNpjNZ3OzfOwZgGWCYdAJVAbJfzAAUqvkAEpmDPo-Hh4nk2RU+nMzm85HQi63dWPc0vp33E-TIGtb7vJ5TKHuTz+xMhzTNEABiqA4IiEDMGi1pcLwDqloSt5VuSD7PK87yfG+vztMYXxvJ4AzDMR7i9P4RpkOo8bwI0M4knU96PIgAC07hBqxAGmqQFBUDQ9BMBA9Fkg8TQIK8QYeIaYwDgKwGzEJ7pMWJgxEPILYMjhJjNu8REkUMZFGvuQ4KYxok2H6Pp+gGmnBlynGDrCsbCoiJmoUp5gMkQ7gea+77tCyDZNr01n2bJMZxseY7npOV4yYQrkiU8PxvOYNg0gaQb1myngcj2vahUB+SzGBEGQAlNbiVq1jhuRQA */
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
                SELECT_EXPLORER_DATA_VIEW: {
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
        storeDataViews: assign((_context, event) =>
          'data' in event && !isError(event.data)
            ? { dataViewsSource: event.data, dataViews: event.data }
            : {}
        ),
        searchDataViews: assign((context) => {
          if (context.dataViewsSource !== null) {
            return {
              dataViews: searchDataViews(context.dataViewsSource, context.search),
            };
          }
          return {};
        }),
        storeInCache: (context, event) => {
          if ('data' in event && !isError(event.data)) {
            context.cache.set(context.search, event.data);
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
      loadDataViews: (context) => {
        const searchParams = context.search;
        return context.cache.has(searchParams)
          ? Promise.resolve(context.cache.get(searchParams))
          : dataViews
              .getIdsWithTitle()
              .then((views) => views.map(DataViewDescriptor.create))
              .then((views) => searchDataViews(views, searchParams));
      },
    },
  });

const searchDataViews = (dataViews: DataViewDescriptor[], search: DataViewsSearchParams) => {
  const { name, sortOrder } = search;

  return dataViews
    .filter((dataView) => Boolean(dataView.name?.includes(name ?? '')))
    .sort(createComparatorByField('name', sortOrder));
};
