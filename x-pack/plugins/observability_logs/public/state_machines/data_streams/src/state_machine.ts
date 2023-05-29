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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrAHQCuAdgJbXpWoA2VAXpAMQAyA8gILID6yHgBUe-LMIBKAUR4BZLAG0ADAF1EoAA4B7WFTraKGkAA9EAdmUBWEuYCMygJxWAHABYrdqwDYANCABPRAAmK2USO3NHczcXb1d3R2VvAF8U-zRMHHwiUgZtVAgaKDYIQzASGgA3bQBrCszsPAJiEnzC4oRq7QBjDCpDFVUh4x09AyMkUws7R1s7FxdQxxXlF3N-IIQXOxIw5QPgtyi7AGY7I7SMjCac1vaiihKwXFxtXBJNBgwAM3fCEiNbItPIFR5QLoUGp9CZDEZTMb6AaTUBmBB2BbmEjBZSnI6uOzeI4XTYhFYkc6nXHmYKnbzeFyOdZXEBA5q5Npg9hYWSSADCAAlBCIxBIZPIlGpRrokYZjGjCeEPOdggtlMFzJr3KSEFY9SQnN43MEjo5vE5PCy2XdQYVuVxJMJhaJxFJZAp4VoZRN5YhFSRlRc1RqtW4dadjiRnOcrG5nBr3Kl0qybsCORAwAAjbSUHpgLAEXA9AAWxWtILYPJ4-KFQhdYvdkvUCO9yN9CDcpxsrhxYSspySji8YcCiDju28UUsk6HVmidjcVtT7NaGezufzhZLZeXNrYJlgmHQFVQP2PuAAFFTlABKNjl9NZnMUPMF1BF0tPB-ET0gRE+qY0UsGx7AtdxPB8HUrHsEgZ3MPEB0Jc07CXLIV1tcEADFUCoBh2Bkbg+GdUU3QlX9-zbQC-UxbFcXxHYiTcElRwQI4XBIHYqROXFHCY8wk2TChtAzeApm-USvXGSjUUQABaPwWPk1DbhBchqFoegmFYCBpSkuUqN1bxTg4pk3HNYJnG8DENhY0Jwjg5RLAxLx3BcZS03uMFil02UUWmBBeLcKMPDcdUmM8RkdVpOYTXnHjoKiE13PQzk7R0ls9L8tFjR1M52JcZRjkiY4pwXNzk3Ekg12fV8t0-KBxJ8gCZI7DFbDjFZQljCyXCsKDI0iaJYlVaJgiM5KbVSrCcLw9LJN89sFy7CkLlcIbYgXEcthNIKByM3qdn7KyBJSIA */
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
