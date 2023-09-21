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
import { DEFAULT_CONTEXT } from './defaults';
import type {
  DataViewsContext,
  DataViewsEvent,
  DataViewsSearchParams,
  DataViewsTypestate,
  DefaultDataViewsContext,
} from './types';

export const createPureDataViewsStateMachine = (
  initialContext: DefaultDataViewsContext = DEFAULT_CONTEXT
) =>
  createMachine<DataViewsContext, DataViewsEvent, DataViewsTypestate>(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVA1AlmA7rAHQCuAdjhejqgDY4BekAxADIDyAgsgPrKcAVTjywBJAKIB1AMoBtAAwBdRKAAOAe1g5q6sipAAPRAFoAnAHYi8gKzzzADgCMAJmsAaEAE8TjgMwAWIl9HADZ-eRDXAF8ojzRMXAJiWnVUCEooZghdMCJKADd1AGtc+Ow8QiIUtIyEAvUAYwwcXQVFNv0NLR09JEMTZ2d7InsQ3yGXdy9EZwCif1NRi1NQkLWxmLiMcqSq1PSyTLAAJ2P1Y6JVWgwAM3OAWyIyxMrqg6g6skKmnraOvq62havVARgQxl8llM-kc4UiU284KG8iIs18dmcK3Wa18mxAzwqyX2kDyEFoYGY0nEnAASgBhAASfEEwjEUjkSk6miBun0YOcdhGvkW-khCMQvnsviIjnMwXM5nkUt8KucITxBN2bxJODJFOk7BpAmZQhEEhk-zU3J6fMQ1lRTlcHkRzn8lkcUuspjFGu2LyJaR1esp4lY4jpxv4prZkktIEBNr6YMcI3Mjnk3vM4oQjlMISIIU9mesvoShL2gYgRAgYAARupyA0wNIwKhjg0ABYZTWEEO0xkm1nmjnKAHW4G2hD+SIy6yzUVZ50SwWy+WK5Wq9WxfF+8vaqs1+uN5ut9tdw492DMAywTDoXKoG7344ACnR8gAlMxLxWawe6w2ZBNi2badt2u5JHGCYTkmMwhCmcJps4jjWPB5jekuCCuiiirevIHryHY4SmKWOyvPsGQAGKoDg5IQMwNKhlwvBRkO7JQeOvKweCkJENCsIRE60xImqQSmBYwrWBuKqODE25kOoNbwH0l5ct0MGggMowjGMExCYixjhIEThhIJJbbj+5CUECdCMJAak8iC-RIpKOnjI62bGH40omXC0QWRB5E1IcDmJppOb2PaKHzmKmHGK6+b2OJcqmFJKrpbJAVllqxIQKFGnOYZ+YuElZmYempgykWPpZWRAZ-qS5L5Vx4VjDKNjTvYi7CWKRBSSKNVbNlQUNYegHAaeYEXoFylWupLXOaKgQuBVsU9TOIRyrK67peMW5DXVv5UTRdHNU5YLxa5ozuZMcXykEoR+eZMRAA */
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
          : dataViews.getIdsWithTitle().then((views) => views.map(parseDataViewListItem));
      },
    },
  });

const searchDataViews = (dataViews: DataViewListItem[], search: DataViewsSearchParams) => {
  const { name, sortOrder } = search;

  return dataViews
    .filter((dataView) => Boolean(dataView.name?.includes(name ?? '')))
    .sort(createComparatorByField<DataViewListItem>('name', sortOrder));
};
