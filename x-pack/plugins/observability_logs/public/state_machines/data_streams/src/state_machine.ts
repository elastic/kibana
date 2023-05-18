/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of } from 'rxjs';
import { assign, createMachine } from 'xstate';
import { IDataStreamsClient } from '../../../services/data_streams';
import { DEFAULT_CONTEXT } from './defaults';
import {
  DataStreamsContext,
  DataStreamsEvent,
  DefaultDataStreamsContext,
  IntegrationTypestate,
} from './types';

export const createPureDataStreamsStateMachine = (
  initialContext: DefaultDataStreamsContext = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrAHQCuAdgJbXpWoA2VAXpAMQAyA8gILID6yHgBUe-LMIBKAUR4BZLAG0ADAF1EoAA4B7WFTraKGkAA9EAdgDMAVhLWAjNYBsAJkvnlADgCcAFm-2ADQgAJ6InvYk-t5+5gHKvvbezgC+KcFomDj4RKQM2qgQNFCcvMgAkgByAOLiAKoAwg3S0sitKupIIDp6BkZdZghWtg7Obh4+-kGhiE72lnYeLp4u886uTmkZGNh4BMQk+YXFpXxVtQBiPOUc7WrGPfpUhsaD5uZOJOYRLk5O1r4nPEnMEwggXMplF9-J5rMpLJ4EvYXG4tiBMrscgcjhB2FhZJIGgAJQQiMQSGTyJT3LqPPqvRAuXwuEjeVaeIHWczLSzzSygxDWCFfOGQ6zWSxOSzuexojHZfakXEAI20lAAxsUsARcOqABZsfE8QkkoSicRSWQKDoPXRPF4DRC+HwkdnmQFOXxebzKFwChC+Zmu6KS97SlGeOU7BW5EgqtUUTUUKDa1C6g0mWCYdBgEioABmOdwAApRQBKNjyvax+MarU6-U22l2+mOoY2OyOVzub1Tf1CllMmIIiU+qW+KNZavYgpFZMXVBUBjsGTcPik80Uq3UzpaFvPfqgQZMlls+wc5Lczy86X+yyrKIxbxSvyQ7yeTwT9Lo6PTvKz4oFyXPECWJDdyUtKkmz3XoDwZcEgzPC8uR5Pl-V8DxXVFax3yBD82S-b8KG0XF4C6KssTImD7UPUxEAAWhBGYEEYkhIXYjiON8SxJ0xRVyGoWh6CYVgIFtWCHSPQVMMmCVYRwtx4X9CJWSfDD4kSZJNm-Cj+JxYpxJo+CYlsZQPHDf4XAlZ1-ScZRvEfd8fWfJIuV4mMZ0KSBDNbKSEHmXwoicTxzHFCEXGfa9zFs6xPCiew-klQEkjcL9tinSi4zAVU62TVN0x8uC2wcFlfWGd0fVHdDvHMEVITcBLu0sNKfwyvSAPnRdlzE5sJNowZmX9ZZTyfIVLHfSUeLSFIgA */
  createMachine<DataStreamsContext, DataStreamsEvent, IntegrationTypestate>(
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
            LOADING_FAILED: {
              target: 'loadingFailed',
            },
          },
        },
        loaded: {
          on: {
            SEARCH_DATA_STREAMS: {
              target: 'debouncingSearch',
            },
          },
        },
        debouncingSearch: {
          entry: 'storeSearch',
          on: {
            SEARCH_DATA_STREAMS: {
              target: 'debouncingSearch',
            },
          },
          after: {
            500: {
              target: 'loading',
            },
          },
        },
        loadingFailed: {
          entry: ['clearCache', 'storeError'],
          exit: 'clearError',
          on: {
            RELOAD_DATA_STREAMS: 'loading',
            SEARCH_DATA_STREAMS: 'debouncingSearch',
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
    }
  );

export interface DataStreamsStateMachineDependencies {
  initialContext?: DataStreamsContext;
  dataStreamsClient: IDataStreamsClient;
}

export const createDataStreamsStateMachine = ({
  initialContext,
  dataStreamsClient,
}: DataStreamsStateMachineDependencies) =>
  createPureDataStreamsStateMachine(initialContext).withConfig({
    services: {
      loadDataStreams: (context, event) => {
        const searchParams = 'search' in event ? event.search : {};

        return from(
          context.cache.has(searchParams)
            ? Promise.resolve(context.cache.get(searchParams))
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
