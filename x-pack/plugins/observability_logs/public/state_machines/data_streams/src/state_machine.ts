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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrAHQCuAdgJbXpWoA2VAXpAMQAyA8gILID6yHgBUe-LMIBKAUR4BZLAG0ADAF1EoAA4B7WFTraKGkAA9EAdmUBWEuYCMygJwBmc1YA0IAJ6IATFeUSO3NHewAOZWCrczC7XwBfeM80TBx8IlIGbVQIGig2CEMwEhoAN20Aa2KU7DwCYhIsnLyEMu0AYwwqQxVVXuMdPQMjJFMLO0dbOzC3Tx8EWJIA5WVnayiYuMTkjFr0hqbcinywXFxtXBJNBgwAMwvCEhq0+szso6hWinLO4d7+0aDfTdEagMwIOzTcwkXyrOIebx+RyTZx2NZWNEBRyQgAsVm2IGedQyjXe7CwskkAGEABKCERiCQyeRKNQDXTAwzGcF2ABsgTxqP8c0QVjFJCcvOcYRxvJlvhxOMcBKJ+zeOXJXEkwnponEUlkCgBWg5w25iD5AqsQoR82cOOhjmtdjFGLcmxVuxeJIgYAARtpKO0wFgCLh2gALPKq15sCk8al0oR6pmG1nqQGmkHmhA45w2KxhWE2kW57EkXkhcKRd2xT2pYkNX0BoMhsOR6NexuwNgmWCYdDFVC3Qe4AAUa2UAEo2DGff7AxRg6HUOGo8c58RjSAgWbRuDLDZ7E5XLbRfYK1XpjXonWkoSu2rSc1jgAxVBUBjsGTcPi6xkGiy267tm+4WlCMJwsKiIIAqYQkLE6KYk4uJhIk94UNovrwKMm44SaQygWCiAALS8qWZH1nsrzkNQtD0EwrAQOyhFcmBCBWFKCGODKp6lv4gSVqE14bLECT3nhz4fCxnKgmMCCOIqJCKc60HzL4ziTL4vjCREol2DiVHegcZLMZmrFyeCOK+KWaLwREDoibWWwSY+NHNouy7tuuUB4TJe7EbmkK2GeHEOkEV56c5RndlJeTvp+kD+UR8kGfmJAljBvgurYOnVvphnoUAA */
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
          entry: ['clearCache', 'clearData', 'storeError'],
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
        storeError: assign((_context, event) => ('data' in event ? { error: event.data } : {})),
        clearCache: assign((context) => ({ cache: context.cache.clear() })),
        clearData: assign((_context) => ({ dataStreams: null })),
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
