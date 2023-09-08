/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isError, omitBy } from 'lodash';
import { assign, createMachine } from 'xstate';
import { Dataset } from '../../../../common/datasets';
import { IDatasetsClient } from '../../../services/datasets';
import { DEFAULT_CONTEXT } from './defaults';
import type {
  DatasetsContext,
  DatasetsEvent,
  DefaultDatasetsContext,
  DatasetsTypestate,
} from './types';

export const createPureDatasetsStateMachine = (
  initialContext: DefaultDatasetsContext = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrAHQCuAdgJbXpWoA2VAXpAMQAyA8gILID6yHgBUe-LMIBKAUR4BZLAG0ADAF1EoAA4B7WFTraKGkAA9EAdmUBWEuYCMygJwBmc1YA0IAJ6IATFeUSO3NHewAOZWCrczC7XwBfeM80TBx8IlIGbVQIGig2CEMwEhoAN20Aa2KU7DwCYhIsnLyEMu0AYwwqQxVVXuMdPQMjJFMLO0dbOzC3Tx8EWJIA5WVnayiYuMTkjFr0hqbcinywXFxtXBJNBgwAMwvCEhq0+szso6hWinLO4d7+0aDfTdEagMwIOzTcwkXyrOIebx+RyTZx2NZWNEBRyQgAsVm2IGedQyjXe7CwskkAGEABKCERiCQyeRKNQDXTAwzGcF2ABsgTxqP8c0QVjFJCcvOcYRxvJlvhxOMcBKJ+zeOXJXEkwnponEUlkCgBWg5w25iD5AqsQoR82cOOhjmtdjFGLcmxVuxeJIgYAARtpKO0wFgCLh2gALPKq15sCk8al0oR6pmG1nqQGmkHmhA45w2KxhWE2kW57EkXkhcKRd2xT2pYkNX0BoMhsOR6NexuwNgmWCYdDFVC3Qe4AAUa2UAEo2DGff7AxRg6HUOGo8c58RjSAgWbRuDLDZ7E5XLbRfYK1XpjXonWkoSu2rSc1jgAxVBUBjsGTcPi6xkGiy267tm+4WlCMJwsKiIIAqYQkLE6KYk4uJhIk94UNovrwKMm44SaQygWCiAALS8qWZH1nsrzkNQtD0EwrAQOyhFcmBCBWFKCGODKp6lv4gSVqE14bLECT3nhz4fCxnKgmMCCOIqJCKc60HzL4ziTL4vjCREol2DiVHegcZLMZmrFyeCOK+KWaLwREDoibWWwSY+NHNouy7tuuUB4TJe7EbmkK2GeHEOkEV56c5RndlJeTvp+kD+UR8kGfmJAljBvgurYOnVvphnoUAA */
  createMachine<DatasetsContext, DatasetsEvent, DatasetsTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'Datasets',
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
            src: 'loadDatasets',
            onDone: {
              target: 'loaded',
              actions: ['storeInCache', 'aggregateAndStoreDatasets', 'storeSearch'],
            },
            onError: 'loadingFailed',
          },
        },
        loaded: {
          on: {
            SEARCH_DATASETS: 'debounceSearchingDatasets',
            SORT_DATASETS: {
              target: 'loading',
              actions: 'storeSearch',
            },
          },
        },
        debounceSearchingDatasets: {
          entry: 'storeSearch',
          on: {
            SEARCH_DATASETS: 'debounceSearchingDatasets',
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
        aggregateAndStoreDatasets: assign((_context, event) =>
          'data' in event && !isError(event.data)
            ? { datasets: Dataset.createWildcardDatasetsFrom(event.data.items) }
            : {}
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
        clearData: assign((_context) => ({ datasets: null })),
        clearError: assign((_context) => ({ error: null })),
      },
    }
  );

export interface DatasetsStateMachineDependencies {
  initialContext?: DefaultDatasetsContext;
  datasetsClient: IDatasetsClient;
}

export const createDatasetsStateMachine = ({
  initialContext,
  datasetsClient,
}: DatasetsStateMachineDependencies) =>
  createPureDatasetsStateMachine(initialContext).withConfig({
    services: {
      loadDatasets: (context) => {
        const searchParams = context.search;

        return context.cache.has(searchParams)
          ? Promise.resolve(context.cache.get(searchParams))
          : datasetsClient.findDatasets(omitBy(searchParams, isEmpty));
      },
    },
  });
