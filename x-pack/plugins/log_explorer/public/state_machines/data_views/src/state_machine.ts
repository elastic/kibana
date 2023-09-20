/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { isError } from 'lodash';
import { assign, createMachine } from 'xstate';
import { DEFAULT_CONTEXT } from './defaults';
import type {
  DataViewsContext,
  DataViewsEvent,
  DataViewsTypestate,
  DefaultDataViewsContext,
} from './types';

export const createPureDataViewsStateMachine = (
  initialContext: DefaultDataViewsContext = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrAHQCuAdgJbXpWoA2VAXpAMQAyA8gILID6yHgBUe-LMIBKAUR4BZLAG0ADAF1EoAA4B7WFTraKGkAA9EAdmUBWEuYCMygJwBmc1YA0IAJ6IATFeUSO3NHewAOZWCrczC7XwBfeM80TBx8IlIGbVQIGig2CEMwEhoAN20Aa2KU7DwCYhIsnLyEMu0AYwwqQxVVXuMdPQMjJFMLO0dbOzC3Tx8EWJIA5WVnayiYuMTkjFr0hqbcinywXFxtXBJNBgwAMwvCEhq0+szso6hWinLO4d7+0aDfTdEagMwIOzTcwkXyrOIebx+RyTZx2NZWNEBRyQgAsVm2IGedQyjXe7CwskkAGEABKCERiCQyeRKNQDXTAwzGcF2ABsgTxqP8c0QVjFJCcvOcYRxvJlvhxOMcBKJ+zeOXJXEkwnponEUlkCgBWg5w25iD5AqsQoR82cOOhjmtdjFGLcmxVuxeJIgYAARtpKO0wFgCLh2gALPKq15sCk8al0oR6pmG1nqQGmkHmhA45w2KxhWE2kW57EkXkhcKRd2xT2pYkNX0BoMhsOR6NexuwNgmWCYdDFVC3Qe4AAUa2UAEo2DGff7AxRg6HUOGo8c58RjSAgWbRuDLDZ7E5XLbRfYK1XpjXonWkoSu2rSc1jgAxVBUBjsGTcPi6xkGiy267tm+4WlCMJwsKiIIAqYQkLE6KYk4uJhIk94UNovrwKMm44SaQygWCiAALS8qWZH1nsrzkNQtD0EwrAQOyhFcmBCBWFKCGODKp6lv4gSVqE14bLECT3nhz4fCxnKgmMCCOIqJCKc60HzL4ziTL4vjCREol2DiVHegcZLMZmrFyeCOK+KWaLwREDoibWWwSY+NHNouy7tuuUB4TJe7EbmkK2GeHEOkEV56c5RndlJeTvp+kD+UR8kGfmJAljBvgurYOnVvphnoUAA */
  createMachine<DataViewsContext, DataViewsEvent, DataViewsTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DataViews',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          on: {
            LOAD_DATASETS: 'loading',
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
          on: {
            SEARCH_DATASETS: 'debounceSearchingDataViews',
            SORT_DATASETS: {
              target: 'loading',
              actions: 'storeSearch',
            },
          },
        },
        debounceSearchingDataViews: {
          entry: 'storeSearch',
          on: {
            SEARCH_DATASETS: 'debounceSearchingDataViews',
          },
          after: {
            300: 'loading',
          },
        },
        loadingFailed: {
          entry: ['clearCache', 'clearData', 'storeError'],
          exit: 'clearError',
          on: {
            RELOAD_DATASETS: 'loading',
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
          'data' in event && !isError(event.data) ? { dataViews: event.data } : {}
        ),
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
        // TODO: implement service for views retrieval
        // const searchParams = context.search;
        // return context.cache.has(searchParams)
        //   ? Promise.resolve(context.cache.get(searchParams))
        //   : dataViews.findDataViews(omitBy(searchParams, isEmpty));
      },
    },
  });
