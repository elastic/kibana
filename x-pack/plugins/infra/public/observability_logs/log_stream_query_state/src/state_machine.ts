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
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRAFoATAE5JOAIySALM0XSAbEukBmZgFZ1AGhBYJ8gOxKcey82nTL5+QA512yQF8PxtJlzF+CmoaYigAMQxuAFsAVQxKehiAJQAZAH0ASQA5DIAVDIBBFIyALQBRABEWdiQQHj4BIVqxBHE9PRx1LvVzc2d5eWZ1Z37jU1bzdRxmPvV5bU0lSX6ldS8fdGwcALIqWlCI6LiEpLKAZQB5FIA1bIBxNLOC68q05BiypIBNTKq2YXqgUEwha4m0rhwzj0+j0kjhdnUsKMJkQ7hwkjs5mW83MOhs8nWIF8WwwcG4lAAbqEzuQKZBiVgMhB6BBBGBtvgKdwANbshk4UmwclU-BQGl0iAMpkIYhcgDG5Ea1WqAN4QKaoFBzm0Cnk0mczCUemkM2G7TGiEUOpk-UGBvk6n0PUJ-MFwuptPpm0ZzMwkQwOE4lEVADNuBgojhXWTKR6JVKIDLOdwFUq2CraoDGiCJAsrNoBlo+tIlC43BaEMpnOjLNqZBZnLY9C7vTgABbkWAM+hnXIFXJlNJhJIXACyaWS6QA0mUfgBhAASBSyd0qGa4auzzUQGisLj0C00Bjmkgryxw7iNuOUunBkixLb87c73fenx+w7HjzKBSSi7SABCv5pIuy6rn8NQbg0hDAtulZKDq2jmOCAx6FCRZYhWehWL0vS6BiCG9O0j5bB2XbevQYQZCkA5JGcQ4juOZw-n+C6AcBoErmu-yZpuMEaqIiDGtI6IOgMzj3r06jSFhOG4fhhpIeYNhrN4RKtmR3YVP2BRpLcZQAOr0Zx4HrnUfGwZqlr3iJMzMAiUJwtC8gVsM0yGss7TaAWEl9CRuCaa2FJ7BAiqhPQ1xFBk2n5BcWRDgU1HcZB5nQZZgkILuNYqMpKySPMehnrI6LaLCzCSNoKiyN55j+c+5FPsF1ChWQooRVFMUZHFjwxHOc5lJUyWqmlAktOCUzmEM2FLCMeiKIVKKVsVFVlRVVUVUhXhqfg3AQHAwgMsN6o5q0CFWFCMJwhiGhIhWYLKDgUklsa3mDIidUEDsQS0JAR1blZrQFuYOD2AMvR4loaF3RVwP3tJSjKe4ynSIodVfXsISiocsTxH9-EnWCxo4Fo4l6iaPTKQt4ziPY1h9GhJaTHYyi1Wp0ZCrGoril6fhMnj6Wgkh1Yk2WzCXswjYVoo8jTMoiIGo62ig9odUhuQhCUJASQxiKYqepK3p87xI0Eyh0zyKscKInCyGnotlXMJCdhKBJDhdDo0h1YFfj86NlrSB0SEofIaHYQ4mGLVICwKMppYh84AfuDoXsvkFIW+ydCzVnqjb3ro1UVksIm2hLDrIY6sIpw1WyyunxvHXBsiOzIykh3M+h2IXMiQgMpc9As+ieGzGmp41IVhaKGdwdJ2flR7eq9A6Shnt3b0WMMyiSAeW9bR4QA */
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
