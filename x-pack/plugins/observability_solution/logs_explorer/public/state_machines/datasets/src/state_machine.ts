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
import { createDefaultContext } from './defaults';
import type {
  DatasetsContext,
  DatasetsEvent,
  DefaultDatasetsContext,
  DatasetsTypestate,
} from './types';

export const createPureDatasetsStateMachine = (
  initialContext: DefaultDatasetsContext = createDefaultContext()
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgOgFcA7AS1PRNQBsSAvSAYgBkB5AQWQH1k2AVNgMoBRXgIDaABgC6iUAAcA9rBIUFRWSAAeiAIwAOAMx49OgEwBWCVevWAbABoQAT10AWU3gsBfL47SZsXDwqBVQIMigGCDUwPDIANwUAa1j-LBx8ELCIhASFAGMMEjVJKVKNRWVVdSQtRFsdAE48CQMzc0cXBHN9PANTVvafPwx0oKzwokiwACcZhRm8OSoMADMFgFs8NMDM0MmoXKJEwurS8trKlWKa0G0EBubBi07dW3MWwwNvn9-XYZAOwywX2EQYwjYACUAMIACW4fEEInE0gqSmuag090eLTaL2ciFcrlsAKB432jAhMPhPH4wlEF3k6OqWN0EnMzVsEh05ls+K6vNseAA7OZSaNdngIGAAEYKYj5MACMCoGb5AAWETJsHBQihcIRdORjJAVxZtXuZkazQMtn6Jn5iAMwua5jFvkBEuB0rlCqVKrVmqm2oYmlgmHQsVQq0jMwAFAYrABKBjaqWy+VERXK1UarVe3Ams03VkIHQ6b6fDnOjoEhD9IWi8UBYETCIAMVQJCojEhQlYHENSIZqMuzJLFvqvLwjWFtj5BnMi55fNeZZ0rjw5i+v13-wBRAU0vgtW1aKqE7uiAAtA469eBn1idzXInTMKXU2PWniGRrtQ6Egc8MVuOoEHcNcNw8L8RhbclsimYDzSvethR0PBbFcPRX1FGwrDvLpy2abxvwLPYwiAscL0xScEEaCRhTwVwNwkPlawFWxGJI2CxnwH1M2zAM82DMikMvMCzFsZpXEaUx9FFNdXw+dlm14kEEKgTtu0oplqNA+49EaD4+T0bDGiw1xtzXTi8B5AxZ3MiQZPM18fB8IA */
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
          on: {
            SEARCH_DATASETS: 'debounceSearchingDatasets',
          },
        },
        loaded: {
          on: {
            SEARCH_DATASETS: 'debounceSearchingDatasets',
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
