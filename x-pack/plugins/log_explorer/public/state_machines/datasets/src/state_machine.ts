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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgOgFcA7AS1PRNQBsSAvSAYgBkB5AQWQH1k2AVNgMoBRXgIDaABgC6iUAAcA9rBIUFRWSAAeiAGwBmAJx4DAdh0BWPXvMAWAIzn9BgDQgAnogAcdvDYP+dACYdfQk9e08AX0jXNExsXDwqBVQIMigGCDUwPDIANwUAaxy4rBx8ZNT0hHyFAGMMEjVJKRaNRWVVdSQtXUNjM0tre0dDVw8EG09A339PHU8wwMWw6NiMMsTKtKIMsAAnfYV9vDkqDAAzY4BbPFKEipSdqBqiAoaulraejpUm7tA2gQdhBMwkEhMJnMjhseh0Ek8nnGiEC5iM5hBJmm+k8BimwTWIHu5SST3SDGEbAASgBhAAS3D4ghE4mk7SUfzUGiBOhMNjwJnC4Vh8J0eJsyOBnnMxjsFmW5m8JjsnhshOJWzJuwpLCpvEZ-GEom+8g5XW5iAMEiMsL5NnhWMChkCksxeB0NkC4MVCz0nj5OnVGwepNSjEptIZPENLJNIF+5p6QLlEl8ljsCvCEjlC0lXr0sosiNhqokapiRODJO24d1+ujzONbJ+Zv+FuB8LTegz0qzOaR7kQVk8AsFgQM03HJitUQrGvwEDAACMFMQ6mABGBUPs6gALdLzilCan0g2N1kyFudNtJxA2cF4QJ2KbdsKQq0uwfA++zfwihxYgigZzlWiSLiua4bluO77rsh6aLAmDoDkqAXMh+wABR6OCACUDDzng4GrkQ66btue4HqBsBxgmN6An0RimBYVi2A4Th5nCvhyrY8yeOEKoEiB8TVlqUAAGKoCQVCMFSQisBwZ5Ghe7LXlyt7AqCeDgpC0IenCCIDhMXpGNmdhmKiegmIEL56NEFZEAoi7wD084qZyAK9AgAC0OiSj5QbCYkxBkH81B0JAbmJvRkwGAWcr3jYJjWjYGJ2C4X7TFp4LgiqIIToKJgBZsjxVLskV0Z5uL8kEfgpYY-o2BKX5PiZBgYiliWNRIHqzusgUlYuEDlWp0WepK5hOlptjTcs07deWfXFYRy7EaR0EUXBVHDR5QKWamQpWW1VndUErptcY-gGPoyp8osfJFSG2zpBJUkRVe7ntnY3YjsqCJTAYcqovMrpingaIYo4V0pXx912UAA */
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
