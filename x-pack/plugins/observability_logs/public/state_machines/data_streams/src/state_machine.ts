/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of } from 'rxjs';
import { assign, createMachine } from 'xstate';
import { FindDataStreamsResponse } from '../../../../common';
import { IDataStreamsClient } from '../../../services/data_streams';
import { DEFAULT_CONTEXT } from './defaults';
import {
  DataStreamsContext,
  DataStreamsEvent,
  DefaultDataStreamsContext,
  DataStreamsTypestate,
} from './types';

export const createPureDataStreamsStateMachine = (
  initialContext: DefaultDataStreamsContext = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrAHQCuAdgJbXpWoA2VAXpAMQAyA8gILID6yHgBUe-LMIBKAUR4BZLAG0ADAF1EoAA4B7WFTraKGkAA9EAdgAsAVhLWAjNYBs11-fPXzADnsAaEACeiD52AL6h-miYOPhEpAzaqBA0UJy8yACSAHIA4uIAqgDChdLSyGUq6kggOnoGRtVmCFa2Ds6uDh7efoGITvYAzHbmygOWA8runj7hkRjYeATEJAlJKWl82XkAYjwZHBVqxrX6VIbGTd5OJN0ATF7KndM9QQi3yso31rMgUQuxy1WEHYWFkkkKAAlBCIxBIZPIlEdqid6hdELdrLcSABOW72LwefyvTGfDw-P4xJakYEAI20lAAxiksARcAyABZsUE8cFQoSicRSWQKSrHXSnc6NRCWbHYkh4gkPJ7dInSyxYjHk+aUuIkWn0ihMihQFmoNmckywTDoMAkVAAMxtuAAFNYPgBKNgUxa6-WM5msjmi5Hi1FS5o2OyOFxuLo+VUITEa74RX7an2AxLJY3bVBUBjsGTcPjQgVw4WIqpaUNnBqgJoYrG4-GE3oIAZ4sKp70A+JZlK5-MgsGQ0uwoUI4PVuq1tFvTE4hWt16WEbylOpijaYHwao9qlimeS+uIAC0TgT5610QzpEoNFOjBYkEPErrpkQ1geJC82Js-XMJw4xeYJbmvf4qRWftjVfMMTwQbEvFsZQRjGCYphVNtbkQuwPlGR4MJmbt017KCkhfEMj3fJpBksEhLCcAlrATFwvHo+wnE4rjuKccCdWWP1DQDM0OVg2dwyTEhlFucwBisW4gOeBMZXML4+NvMjsygQcCwgMTjw-BB1QTAYkJIJxNXCUIgA */
  createMachine<DataStreamsContext, DataStreamsEvent, DataStreamsTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DataStreams',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          on: {
            LOAD_DATA_STREAMS: 'loading',
          },
        },
        loading: {
          invoke: {
            src: 'loadDataStreams',
          },
          on: {
            LOADING_SUCCEEDED: {
              target: 'loaded',
              actions: ['storeInCache', 'storeDataStreams', 'storeSearch'],
            },
            LOADING_FAILED: 'loadingFailed',
          },
        },
        loaded: {
          on: {
            SEARCH: 'debouncingSearch',
          },
        },
        debouncingSearch: {
          entry: 'storeSearch',
          on: {
            SEARCH: {
              target: 'debouncingSearch',
            },
          },
          after: {
            SEARCH_DELAY: {
              target: 'loading',
            },
          },
        },
        loadingFailed: {
          entry: ['clearCache', 'storeError'],
          exit: 'clearError',
          on: {
            RELOAD_DATA_STREAMS: 'loading',
            SEARCH: 'debouncingSearch',
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
        storeDataStreams: assign((_context, event) =>
          'data' in event
            ? {
                dataStreams: event.data.items,
              }
            : {}
        ),
        storeInCache: assign((context, event) => {
          if (event.type !== 'LOADING_SUCCEEDED') return {};

          return {
            cache: context.cache.set(context.search, event.data),
          };
        }),
        clearCache: assign((context, event) => {
          if (event.type !== 'LOADING_FAILED') return {};

          return {
            cache: context.cache.clear(),
          };
        }),
        storeError: assign((_context, event) =>
          'error' in event
            ? {
                error: event.error,
              }
            : {}
        ),
        clearError: assign((_context) => ({ error: null })),
      },
      delays: {
        SEARCH_DELAY: (_context, event) => {
          if (event.type !== 'SEARCH' || !event.delay) return 0;

          return event.delay;
        },
      },
    }
  );

export interface DataStreamsStateMachineDependencies {
  initialContext?: DefaultDataStreamsContext;
  dataStreamsClient: IDataStreamsClient;
}

export const createDataStreamsStateMachine = ({
  initialContext,
  dataStreamsClient,
}: DataStreamsStateMachineDependencies) =>
  createPureDataStreamsStateMachine(initialContext).withConfig({
    services: {
      loadDataStreams: (context, event) => {
        const searchParams =
          'search' in event ? { ...context.search, ...event.search } : context.search;

        return from(
          context.cache.has(searchParams)
            ? Promise.resolve(context.cache.get(searchParams) as FindDataStreamsResponse)
            : dataStreamsClient.findDataStreams(searchParams)
        ).pipe(
          map(
            (data): DataStreamsEvent => ({
              type: 'LOADING_SUCCEEDED',
              data,
            })
          ),
          catchError((error) =>
            of<DataStreamsEvent>({
              type: 'LOADING_FAILED',
              error,
            })
          )
        );
      },
    },
  });
