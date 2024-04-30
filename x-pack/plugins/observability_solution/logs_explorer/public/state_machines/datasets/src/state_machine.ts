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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgOgFcA7AS1PRNQBsSAvSAYgBkB5AQWQH1k2AVNgMoBRXgIDaABgC6iUAAcA9rBIUFRWSAAeiAGwBmAJx4DAdh0BWHQCZzAGhABPRAA4AjHnMBfT-bSZsuHhUCqgQZFAMEGpgeGQAbgoA1jF+WDj4waHhCPEKAMYYJGqSUiUaisqq6khauobGZpY29k4IACzOVh7evhhpgZlhRBFgAE6jCqN4clQYAGaTALZ4qQEZIUNQOUQJBVUlZTUVKkXVoNoIrlddEhImbs2OiDZG5lcGEm1mrh9fPSCrdJBDbhBjCNgAJQAwgAJbh8QQicTScpKE5qDQXHQmNp4Ex6Np6Ex2J6XZzmYyuHTUmm0-T-QEDEHDMEsCG8eH8YSiQ7yNFVTGID5GQnElqIK4mPA6NpWK56CQGcxWPTOO4MvprYGhRjg6FwnhcpG8kDHAU1C5UiR4NrmPSuR6tKwSPSUunuvQa-xAwa6tkcw2Inkoo7806Cy46a22+2OxB6VV4-Girw+AGaoEQMAAIwUxDyYAEYFQozyAAtwozYGChJDYZyg8iZKHKuGLYg2rc8HKOinxZdO9001W8Fnc-nC8XSxXhlWGJpYJh0DFUHNl6MABQKiQASgYI7HeaIBaLJfLlYzuBNZrb5zqRlMFmsJKdeh0Nqp7rpXv66yywwAMVQEgqEYCEhFYDgG25JtUVbDF20ua48Fue4HRfZ5FRQ95Pm+X4TG8NMiAULN4BqKs4PRM5agQABaHR+3on8tWIMgTmoOhIEo8073aAxXSpTtrDaAxRLEtp+06ZifWZKBuNvGjnAMXFn37OUjEVZVVU0lU1QI4dLz-LMIHkhDeNlfstJQ8w2h0ZxiWkwJDwnU9pwvb1cFM6iLiJa0CSJDDLgMHRHKM8IgJAriWyoiNXHtZw8VcRUAv7KlXiVXSdO0-TvCAA */
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
            SORT_DATASETS: {
              target: 'loading',
              actions: 'storeSearch',
            },
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
