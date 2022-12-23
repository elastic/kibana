/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsQueryConfig } from '@kbn/es-query';
import { actions, ActorRefFrom, createMachine, SpecialTargets } from 'xstate';
import { FilterManager, QueryStart, QueryStringContract } from '@kbn/data-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { IToasts } from '@kbn/core-notifications-browser';
import { OmitDeprecatedState, sendIfDefined } from '../../xstate_helpers';
import { logStreamQueryNotificationEventSelectors } from './notifications';
import { validateQuery } from './validate_query_service';
import type {
  LogStreamQueryContext,
  LogStreamQueryContextWithDataViews,
  LogStreamQueryContextWithParsedQuery,
  LogStreamQueryContextWithQuery,
  LogStreamQueryContextWithValidationError,
  LogStreamQueryEvent,
  LogStreamQueryTypestate,
  LogStreamQueryContextWithFilters,
} from './types';
import {
  initializeFromUrl,
  updateQueryInUrl,
  updateFiltersInUrl,
  subscribeToUrlStateStorageChanges,
  safeDefaultParsedQuery,
} from './url_state_storage_service';
import {
  subscribeToQuerySearchBarChanges,
  subscribeToFilterSearchBarChanges,
  updateQueryInSearchBar,
  updateFiltersInSearchBar,
} from './search_bar_state_service';
import { resolveSavedQueryId } from './saved_query_service';

export const createPureLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRAFYATDmYBmWQDYAnMwAsARknjZ69aoA0ILIgDs05pNnjN4hQA5JS9SbsBfV4bSZcAC3KwvbHpkAFUAUQAlAE0AfQAxCIB5AFkYkIiAGRiAYQAJAEEAOQBxMIARFnYkEB4+ASFqsQR7aV1mE0VJBXlFJUNjBDtZHBNxZjlJZiUFSVHbd090bBw-AKWsejL8gBV8mIA1AEkwgHUAZRyCkvLK4Vr+QkFhJqVxOxxZZm1VOasFbX6iGmOCUJn+3Ts6i+6ns6gWIECvn8iOC4Wi8SSqTOYXyETyMQAQrjLkVShU2HdeA8no1EPJxDhVApVPIIRopAYjIghiMxnJmHoobJHOJ4YiVsj1jgAG5UQgQchkfBQej7fIZQ5bbaHRKFeL5Q4ZG4U6r3erPIHMnCzVTtN56STqKyAhCOaSWKQWWS2pSWWQmMVS1bi2XUBVKlVqjVanV6s4hbLZMLlY1VLhU820hCyOwKEbMf6qVSSOx2axaF1u61WSaWH1+gPw-DcCBwYSIyl1R4NUBNAC06m0ODsZnE2lkSl99gULoHVskqknvpLCmZTtUge8eCIpAo1DoEE71J7okQA6+w9H48nXVzshduiU+Z0YOnJlUoo8CKDku8R8zvaICWJiMsyrI5uyC6zmCIyLkoQyDn6UiSJuyzBlKobyv+3YWtm9g4Oo8FmB0UyWC6xZPpCUKQgoHQKF8KFfuK6FbsQmGHqaGY4VmvrMNaoLWLYUJjH0XIIBRw5tDRdEMahSJrFu7GKsQUDYTSgHNPBBEWEoE6ESYJgwpyAySI42kKM4LTFtoWjuO4QA */
  createMachine<LogStreamQueryContext, LogStreamQueryEvent, LogStreamQueryTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'Query',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: {
            target: 'initializingFromUrl',
          },
        },
        initializingFromUrl: {
          entry: ['initializeFromUrl'],
          on: {
            URL_INITIALIZED: {
              target: 'hasQuery',
            },
            RESOLVING_SAVED_QUERY_ID: {
              target: 'resolvingSavedQueryId',
            },
          },
        },
        resolvingSavedQueryId: {
          invoke: {
            src: 'resolveSavedQueryId',
            onDone: {
              target: 'hasQuery',
              actions: ['storeResolvedSavedQuery'],
            },
            onError: {
              target: 'failedResolvingSavedQueryId',
            },
          },
        },
        failedResolvingSavedQueryId: {}, // TODO: Add error handling, probably want to copy the behaviour of use_saved_query from the stateful search bar
        hasQuery: {
          entry: ['updateQueryInUrl', 'updateQueryInSearchBar', 'updateFiltersInSearchBar'],
          invoke: [
            {
              src: 'subscribeToUrlStateStorageChanges',
            },
            {
              src: 'subscribeToQuerySearchBarChanges',
            },
            {
              src: 'subscribeToFilterSearchBarChanges',
            },
          ],
          initial: 'validating',
          states: {
            valid: {
              entry: 'notifyValidQueryChanged',
            },
            invalid: {
              entry: 'notifyInvalidQueryChanged',
            },
            validating: {
              invoke: {
                src: 'validateQuery',
              },
              on: {
                VALIDATION_FAILED: {
                  target: 'invalid',
                  actions: ['clearParsedQuery', 'storeValidationError'],
                },
                VALIDATION_SUCCEEDED: {
                  target: 'valid',
                  actions: ['clearValidationError', 'storeParsedQuery'],
                },
              },
            },
          },
          on: {
            STATE_FROM_URL_KEY_CHANGED: {
              target: '.validating',
              actions: [
                'storeQuery',
                'storeFilters',
                'updateQueryInSearchBar',
                'updateFiltersInSearchBar',
              ],
            },
            QUERY_FROM_SEARCH_BAR_CHANGED: {
              target: '.validating',
              actions: ['storeQuery', 'updateQueryInUrl'],
            },
            FILTERS_FROM_SEARCH_BAR_CHANGED: {
              target: '.validating',
              actions: ['storeFilters', 'updateFiltersInUrl'],
            },
            DATA_VIEWS_CHANGED: {
              target: '.validating',
              actions: 'storeDataViews',
            },
          },
        },
      },
    },
    {
      actions: {
        notifyInvalidQueryChanged: actions.pure(() => undefined),
        notifyValidQueryChanged: actions.pure(() => undefined),
        storeQuery: actions.assign((_context, event) => {
          return 'query' in event ? ({ query: event.query } as LogStreamQueryContextWithQuery) : {};
        }),
        storeFilters: actions.assign((_context, event) =>
          'filters' in event ? ({ filters: event.filters } as LogStreamQueryContextWithFilters) : {}
        ),
        storeDataViews: actions.assign((_context, event) =>
          'dataViews' in event
            ? ({ dataViews: event.dataViews } as LogStreamQueryContextWithDataViews)
            : {}
        ),
        storeResolvedSavedQuery: actions.assign((_context, event) =>
          'data' in event
            ? {
                query: event.data.query,
                filters: event.data.filters,
                parsedQuery: safeDefaultParsedQuery,
              }
            : {}
        ),
        storeValidationError: actions.assign((_context, event) =>
          'error' in event
            ? ({
                validationError: event.error,
              } as LogStreamQueryContextWithQuery & LogStreamQueryContextWithValidationError)
            : {}
        ),
        storeParsedQuery: actions.assign((_context, event) =>
          'parsedQuery' in event
            ? ({ parsedQuery: event.parsedQuery } as LogStreamQueryContextWithParsedQuery)
            : {}
        ),
        clearValidationError: actions.assign(
          (_context, _event) =>
            ({ validationError: undefined } as Omit<
              LogStreamQueryContextWithValidationError,
              'validationError'
            >)
        ),
        clearParsedQuery: actions.assign(
          (_context, _event) =>
            ({ parsedQuery: undefined } as Omit<
              LogStreamQueryContextWithParsedQuery,
              'parsedQuery'
            >)
        ),
      },
    }
  );

export interface LogStreamQueryStateMachineDependencies {
  kibanaQuerySettings: EsQueryConfig;
  queryStringService: QueryStringContract;
  filterManagerService: FilterManager;
  urlStateStorage: IKbnUrlStateStorage;
  toastsService: IToasts;
  savedQueriesService: QueryStart['savedQueries'];
}

export const createLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews,
  {
    kibanaQuerySettings,
    queryStringService,
    toastsService,
    filterManagerService,
    urlStateStorage,
    savedQueriesService,
  }: LogStreamQueryStateMachineDependencies
) =>
  createPureLogStreamQueryStateMachine(initialContext).withConfig({
    actions: {
      initializeFromUrl: initializeFromUrl({ toastsService, urlStateStorage }),
      notifyInvalidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        logStreamQueryNotificationEventSelectors.invalidQueryChanged
      ),
      notifyValidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        logStreamQueryNotificationEventSelectors.validQueryChanged
      ),
      updateQueryInUrl: updateQueryInUrl({ urlStateStorage }),
      updateQueryInSearchBar: updateQueryInSearchBar({ queryStringService }),
      updateFiltersInUrl: updateFiltersInUrl({ urlStateStorage }),
      updateFiltersInSearchBar: updateFiltersInSearchBar({ filterManagerService }),
    },
    services: {
      validateQuery: validateQuery({ kibanaQuerySettings }),
      subscribeToQuerySearchBarChanges: subscribeToQuerySearchBarChanges({
        queryStringService,
      }),
      subscribeToFilterSearchBarChanges: subscribeToFilterSearchBarChanges({
        filterManagerService,
      }),
      subscribeToUrlStateStorageChanges: subscribeToUrlStateStorageChanges({ urlStateStorage }),
      resolveSavedQueryId: resolveSavedQueryId({ savedQueriesService }),
    },
  });

export type LogStreamQueryStateMachine = ReturnType<typeof createLogStreamQueryStateMachine>;
export type LogStreamQueryActorRef = OmitDeprecatedState<ActorRefFrom<LogStreamQueryStateMachine>>;
