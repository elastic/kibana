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

/**
 * TODO
 * - Split search and sort into 2 different events
 * - Split states into UI accessible interactions, keep track of current UI state for this
 */

export const createPureDataStreamsStateMachine = (
  initialContext: DefaultDataStreamsContext = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrAHQCuAdgJbXpWoA2VAXpAMQAyA8gILID6yHgBUe-LMIBKAUR4BZLAG0ADAF1EoAA4B7WFTraKGkAA9EAdmUBGEuavKAnAGYArACYHy5QA5l5gDQgAJ6I3jYuXl4AbM7KUS5WrgC+SYFomDj4RKQM2qgQNFCcvMgAkgByAOLiAKoAwnXS0sjNKupIIDp6BkYdZgiWNnaOrh5evgHBiFGJJC6WTm4+1lHeYSlpGNh4BMQkufmFxXwV1QBiPKUcrWrGXfpUhsb95gAsbiQO5vFuVq-eUQWbkCIQQS2UtleDi+Dg8Diir3+GxA6W2WT2Bwg7CwskkdQAEm07roHk8+og3O5Pr81k5AW4nFY3iDEO4IW9oeY3N4nG9LN5kajMrtSFiAEbaSgAY0KWAIuClAAs2DieHjCbcOvces9Wa8bK9vi5XvNFuZnE4WQhER9KV4mfEXPDlG5BVthdkSOLJRQZRQoHLUArlSZYJh0GASKgAGYR3AAClV6sE0g4PAAmgBKNhCnae73S2XypVErUknXkgbWWz2ZzuTzLSag9y2iLWZxMpzKRZujJ5jF5Ar+s6oKgMdgybh8QQiMQSGTyJSarTlx69UD9SkfWFWWn0xnMqYIRbhSIeVZOBxWJZOXtokX7QeFEdj7G4gmllfdNe6sFUnd7lyB6vFaiIOCQLpuK8ygRPqPguC4UQpKkIAUNoWLwB0ubophX6kuupiIAAtFEVpES4nzQpyV4Mr8USUneHp7JQNAPIwLCQMS35khurJOiQ3gON4iI8mEglQVaYSUVRiRuOYTpREhKHYQ+mKFFx+G-g4+okG48QzN2yjvOYixWh43hzJEViwtBThrIijH9jkg6cWW3EEf0iSvCQryrPJ5rmACRlfFa8QWfqikmYkCR0o5OFemAEqFv6gbBhpFa8QgEQ2N216vE4BWdl2IFHlC5iQlRdKRIhSmbH28VqcOo7jhA6U-pW7xWnZFH0VCDguL4vlXshSRAA */
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
