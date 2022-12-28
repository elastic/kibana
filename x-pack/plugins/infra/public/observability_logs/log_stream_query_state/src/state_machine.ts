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
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRAFoALAE5JOAMzMATM1kAOAKzLJANjUAaEFgkBGHQHYcJ+Sek6T5nfIvnzkgL7vDaTLmL8KahpiKAAxDG4AWwBVDEp6ACUAUQBlAHkAGQA1AEkAOQBxAH0UgEEspIARIuRopISATSKcypZ2JBAePgEhDrEEcQ01aRxlNSdJE2YdJTUTDUNjBHkRnQ0TcfslE0ld+U9vdGwcfzIqWhDwqNj4-JyAFRzSjJyALSqi0IS0gFki6ISGTawi6AUEwn64nkSnkOCGzkkGm25nkrgWRlMzDkQ2kQymKOk0wsBxAPmOGDg3EoADcQilyNTIGSsDkIPQIIIwCd8NTuABrLnMnAU2BU2n4KD0xkQZmshDEXkAY3IPTawI6oJ6EIksw0OCU0nManGkkczDUkgti0Q1mYODc2jURvWOyUOhJQpFYrpDKZRxZbMwEQwOE4lBVADNuBhIjhPZSaT7pbKIPKedxlaq2OquLwwb1QJCNDodDhLbjzIbK1o3daEEoNHrzGZDapmNY1G6PF5Sf6cAALciwZn0FL3Ur3JKfb5-AEZIoAaSSTQAwgAJUqFKo5zp5rV9RB2SyEnSSeQaXZqZwzOsrMtOo0zDaKEzzD19wfD-30Wr1JpfX4SiSUoEnXIoACEQKKddNwKbc2BBPdCHBA961NUZ1DUZgNFcBslDrNYcFkVRUQcOxJCxfYeyFT8R1CHIMknBIUmnQCUmA0C1wgqCYK3VoEI1JCUMLRAdGUIjSKdN1cRheQCL1YjpFIytTyxd1qI-IcR0qCdSiKXIkgAdRY3i4P49pc26ZCC1EG1ZiUe1pFfNYLQorFJDrSsrAsGQG3NXZi3Uw5fAHLS+wpalzggFUQnoLJnhaCccjSPJPlKBj4Is3crOE2yECPIjcR2S1sKPcxb2YWEVgtEizA2GYNHfELaPCsBIuoaKyAlOKEp0x4UpKaIVxXJIqkyxCcps-oVjtSQlEcaxZmUEtXAqqrpBqpS6vGBsmuOdrCE62L4pePrktSlIhpGsbzIm-NtQGawFPMN0NlsSYZJ0OtdhMe1TXMIY5pmLDpD23ADqO7qTsS-rUtCdKMnGwTJoekwGz+hsLEbJzhlPAjmEseY9Ao+btkbTwe3wbgIDgYRmTu-cRIGJxLDGCYpmB+Y6yhBwFHkU0nMcS03RLMG8CIUhAloSAGesh7BhUbzpAbDaVDmfCMQGJQDRwK8StxXytAvMXTil4IJSuGI4ll3Ki1PfU6pWN1oVfbnlasBFTw0RQZHPMWvUTCUpT9XxWRtqaJCGO0S2VixBZemQ6zRtQyxWuxKMJXCxYjchCEoSAEgTcVJV9GV-TD5H7tQwYrysZXzCxb2AeGdEln5lOGzMFR05UXaNOasLfHD1HpBGVRLSwnCXqRbnbDHtHtavZXdGmNQxZakKIeH1DSKI2wVMUVQLTkzXdjtQ05uNU8r7mdfB+OBUou3pnl9GDZAbE7WnA1pYz6ItxZgmhviYO+X4QoRSijFCUz88oN1+p2NycxhimmmHWJQFF9Q6CUleSsRV7BUWCvtSBXUoAwKLLCd6WDlZKRLBRNYbsHLWFPHoJ8Z52yNQpkAA */
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
          on: {
            RESOLVING_SAVED_QUERY_ID: {
              target: 'resolvingSavedQueryId',
            },
            INITIALIZED_FROM_URL: {
              target: 'validating',
              actions: ['storeQuery', 'storeFilters'],
            },
          },

          invoke: {
            src: 'initializeFromUrl',
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

        // TODO: Add error handling, probably want to copy the behaviour of use_saved_query from the stateful search bar
        failedResolvingSavedQueryId: {},

        hasQuery: {
          entry: ['updateQueryInUrl', 'updateQueryInSearchBar', 'updateFiltersInSearchBar'],
          invoke: [
            {
              src: 'subscribeToQuerySearchBarChanges',
            },
            {
              src: 'subscribeToFilterSearchBarChanges',
            },
            {
              src: 'subscribeToUrlStateStorageChanges',
            },
          ],
          initial: 'revalidating',
          states: {
            valid: {
              entry: 'notifyValidQueryChanged',
            },
            invalid: {
              entry: 'notifyInvalidQueryChanged',
            },
            revalidating: {
              invoke: {
                src: 'validateQuery',
              },
              on: {
                VALIDATION_FAILED: {
                  target: 'invalid',
                  actions: ['storeValidationError'],
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
              target: '.revalidating',
              actions: [
                'storeQuery',
                'storeFilters',
                'updateQueryInSearchBar',
                'updateFiltersInSearchBar',
              ],
            },
            QUERY_FROM_SEARCH_BAR_CHANGED: {
              target: '.revalidating',
              actions: ['storeQuery', 'updateQueryInUrl'],
            },
            FILTERS_FROM_SEARCH_BAR_CHANGED: {
              target: '.revalidating',
              actions: ['storeFilters', 'updateFiltersInUrl'],
            },
            DATA_VIEWS_CHANGED: {
              target: '.revalidating',
              actions: 'storeDataViews',
            },
          },
        },

        validating: {
          invoke: {
            src: 'validateQuery',
          },

          on: {
            VALIDATION_SUCCEEDED: {
              target: 'hasQuery.valid',
              actions: 'storeParsedQuery',
            },

            VALIDATION_FAILED: {
              target: 'hasQuery.invalid',
              actions: ['storeValidationError', 'storeDefaultParsedQuery'],
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
        storeDefaultParsedQuery: actions.assign(
          (_context, _event) =>
            ({ parsedQuery: safeDefaultParsedQuery } as LogStreamQueryContextWithParsedQuery)
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
      notifyInvalidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        logStreamQueryNotificationEventSelectors.invalidQueryChanged
      ),
      notifyValidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        logStreamQueryNotificationEventSelectors.validQueryChanged
      ),
      updateQueryInUrl: updateQueryInUrl({ toastsService, urlStateStorage }),
      updateQueryInSearchBar: updateQueryInSearchBar({ queryStringService }),
      updateFiltersInUrl: updateFiltersInUrl({ toastsService, urlStateStorage }),
      updateFiltersInSearchBar: updateFiltersInSearchBar({ filterManagerService }),
    },
    services: {
      initializeFromUrl: initializeFromUrl({ toastsService, urlStateStorage }),
      validateQuery: validateQuery({ kibanaQuerySettings }),
      subscribeToQuerySearchBarChanges: subscribeToQuerySearchBarChanges({
        queryStringService,
      }),
      subscribeToFilterSearchBarChanges: subscribeToFilterSearchBarChanges({
        filterManagerService,
      }),
      subscribeToUrlStateStorageChanges: subscribeToUrlStateStorageChanges({
        toastsService,
        urlStateStorage,
      }),
      resolveSavedQueryId: resolveSavedQueryId({ savedQueriesService }),
    },
  });

export type LogStreamQueryStateMachine = ReturnType<typeof createLogStreamQueryStateMachine>;
export type LogStreamQueryActorRef = OmitDeprecatedState<ActorRefFrom<LogStreamQueryStateMachine>>;
