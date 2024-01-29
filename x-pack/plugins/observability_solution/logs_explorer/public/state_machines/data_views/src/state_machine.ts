/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewListItem, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { isError } from 'lodash';
import { assign, createMachine } from 'xstate';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { parseDataViewListItem } from '../../../utils/parse_data_view_list_item';
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
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVA1AlmA7rAHQCuAdjhejqgDY4BekAxADIDyAgsgPrKcAVTjywBJAKIB1AMoBtAAwBdRKAAOAe1g5q6sipAAPRABYAzKaIB2a6bOWArABoQAT0QBaAJzyi9y8YAmAEYADgcAX3DnNExcAmJadVQISihmCF0wIkoAN3UAayyY7DxCIkTk1IRc9QBjDBxdBUVm-Q0tHT0kQxNjSyJPP3lTIICnV0RLTyJ5eUsQ0ftI6IwS+PKklLI0sAAnXfVdolVaDAAzQ4BbImK4soqtqGqyPPrO5tbu9u1GrtAjBAANgcRFMDmcbgQIPsIQCw0WyxAt1KCU2kGyEFoYGY0nEnAASgBhAASfEEwjEUjkSjamh+un0AOsgN8nksgPsgLGEJMHKIgNCgRC9mMC2siOR6we6JwmOx0nY+IEZKEIgkMk+ajpnUZJk8ISIAQCHK540hpgCBoWgOM8lNEtWd1RyRlcpx4lY4kJyv4qspkk1IG+Ou6AMB8gNfkCoXBEwQ9gtM1GgzZ+qC4qiSMdKI2LogRAgYAARupyLUwNIwKhdrUABapSWEd0Ekkqinq6nKL7a366hBBeT2ez8zncuMJ6ZzEX2VNiywO2I56X5wslssVqs1+vbRuwZgGWCYdBZVBnY+7AAUplmAEpmLvc4WV8XS2Ry5Xq3WG9n4oHg73Q0mEIDXDYwwLMexLUBMEeQQcwLE8II0wCYxARCcMpwXNZ7k2VIADFUBwLEIGYfEPS4XhfXbKk-x7BlAKBaDfACSxbDBM0PACUFPGMBMEURMh1ELeBul3WkOgA-5EFMYUrBsOwOIQdwUK4oYRjGLCnVICgqBoegmAgcT6T+HoEDAlkxnmRZYPcIIhxmSx4Q0zMHweVIjJDKSzNtIgQlmKyx0hZThxCHi+OclZFylNFDO7CT6K83ifCNE1AsQFCglBIIbTtCKsyinC8wxLEPMk0zARtUF7Ds01YN44dAj8OFglFBTNKXGKCxfdcPy3b8CpErV4pMgEBztUEVJjRSzEyzxLOaoJWvY9rosqbYCKIyBSoS0y5q4nLarjZT+j8BZnMiIA */
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
  discover: DiscoverStart;
}

export const createDataViewsStateMachine = ({
  initialContext,
  dataViews,
  discover,
}: DataViewsStateMachineDependencies) =>
  createPureDataViewsStateMachine(initialContext).withConfig({
    actions: {
      navigateToDiscoverDataView: (_context, event) => {
        if (event.type === 'SELECT_DATA_VIEW' && 'dataView' in event) {
          discover.locator?.navigate({ dataViewId: event.dataView.id });
        }
      },
    },
    services: {
      loadDataViews: (context) => {
        const searchParams = context.search;
        return context.cache.has(searchParams)
          ? Promise.resolve(context.cache.get(searchParams))
          : dataViews
              .getIdsWithTitle()
              .then((views) => views.map(parseDataViewListItem))
              .then((views) => searchDataViews(views, searchParams));
      },
    },
  });

const searchDataViews = (dataViews: DataViewListItem[], search: DataViewsSearchParams) => {
  const { name, sortOrder } = search;

  return dataViews
    .filter((dataView) => Boolean(dataView.name?.includes(name ?? '')))
    .sort(createComparatorByField<DataViewListItem>('name', sortOrder));
};
