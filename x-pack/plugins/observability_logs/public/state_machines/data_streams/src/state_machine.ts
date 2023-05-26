/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrAHQCuAdgJbXpWoA2VAXpAMQAyA8gILID6yHgBUe-LMIBKAUR4BZLAG0ADAF1EoAA4B7WFTraKGkAA9EAdmUBWEuYCMygJwAWS1asAmOwGYANCABPRA8rZRI7c0cANisIqPjnR3MADgBfVP80TBx8IlIGbVQIGig2CEMwEhoAN20Aa0qs7DwCYhICopKEGu0AYwwqQxVVYeMdPQMjJFMLO0dbO2Tzc2dvKKSPcyt-IIRkuxJQ5WPnZKsoh3W0jJAmnNb8wuKKUrBcXG1cEk0GDAAzT6EEh3Fp5dpPLo9fqTYajabjfSDKagMwIOyLcwkDzKbwRRLKZKE847YKOea4jyOQkeTaOOwebzpTIYZq5NodCDsLCySQAYQAEoIRGIJDJ5Eo1GNdIjDMZUXYomFnFZcWtTspzLioh4SQh3DYnFFvEsPGcrC5GTcQWzHkUuVxJMIhaJxFJZAo4VppZM5YgFUqVT4ourNQqdYFEN5XCRHIHTdrks5rB5nEzbiz7mDOQAjbSUXpgLAEXC9AAWJWtDzY3J4fMFQhdovdEvU8O9SN9CFWNisyWxzjikXMDN1iQOUUi62WzmcmwuVjTlazYFz+cLxbLFYzoOIbBMsEw6EqqD+R9wAApvMcAJRsJdtHN5igFouoEvll732CekAIn3TVE3AWJxXGsTwfF1Kx7BICckhnbVnG1dZF23G1wU6F4ADFUCoBh2Bkbg+GdEU3XFH8-w7AC-QxLEcTxRwCSJKJdRTZISH2K9aVjKNEgXNMKG0Tl4GmL8pQmSiUUQABaZiIwQKSbDJJTlJUy1mWyHdSEoGhEUYFhIDEmVkRmPUjXYqllQJZQUyiJYWNCGDJxcI06UiNT0w0tCORKQz-0khAXGcGNlSjFUlJTcwWO8eYaWiFZkkcFNziWFDPIedDOQgXyJJM2ddR8NjkmUUDlX2HEtlS1l0sfNdX3fLc0rybLZSort0VsI4IkWdY7Eg6MIjg7xhzmay+PUqqwW8rCcLwrK23Elr-LsbsSApc1rI8Cc7E8FiU1W6JvGilIyS2y10iAA */
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
          id: 'loading',
          invoke: {
            src: 'loadDataStreams',
            onDone: {
              target: 'loaded',
              actions: ['storeInCache', 'storeDataStreams', 'storeSearch'],
            },
            onError: 'loadingFailed',
          },
        },
        loaded: {
          on: {
            SEARCH_DATA_STREAMS: 'debounceSearchingDataStreams',
            SORT_DATA_STREAMS: {
              target: 'loading',
              actions: 'storeSearch',
            },
          },
        },
        debounceSearchingDataStreams: {
          entry: 'storeSearch',
          on: {
            SEARCH_DATA_STREAMS: 'debounceSearchingDataStreams',
          },
          after: {
            300: 'loading',
          },
        },
        loadingFailed: {
          entry: ['clearCache', 'storeError'],
          exit: 'clearError',
          on: {
            RELOAD_DATA_STREAMS: 'loading',
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
          'data' in event ? { dataStreams: event.data.items } : {}
        ),
        storeInCache: assign((context, event) =>
          'data' in event ? { cache: context.cache.set(context.search, event.data) } : {}
        ),
        clearCache: assign((context) => ({
          cache: context.cache.clear(),
          dataStreams: null,
        })),
        storeError: assign((_context, event) => ('data' in event ? { error: event.data } : {})),
        clearError: assign((_context) => ({ error: null })),
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
      loadDataStreams: (context) => {
        const searchParams = context.search;

        return context.cache.has(searchParams)
          ? Promise.resolve(context.cache.get(searchParams) as FindDataStreamsResponse)
          : dataStreamsClient.findDataStreams(searchParams);
      },
    },
  });
