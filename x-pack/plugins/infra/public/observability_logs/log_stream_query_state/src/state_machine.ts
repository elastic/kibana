/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsQueryConfig } from '@kbn/es-query';
import { actions, ActorRefFrom, createMachine, SpecialTargets } from 'xstate';
import type { FilterManager, QueryStringContract } from '@kbn/data-plugin/public';
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

export const createPureLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRAFoALAE5JOAMzMATM1kAOAKzLJANjUAaEFgkBGHQHYcJ+Sek6T5nfIvnzkgL7vDaTLmL8KahpiKAAxDG4AWwBVDEp6AEkAOQSAFQSAQQAZBIAtAFEAEQB9UIAlAHkAWWLosqyWdiQQHj4BIWaxBHF5JXkcDTVnSQ0lB3lXDUNjbpNmOUHpQbnzeWlmHQtPb3RsHAALclgfbHoAZVSM1PzSypq6rOKAaXyATWKAYQAJDKSAcSKjWErQCgmEXTslnWOkk8g0kkkQ02SmmiDWOERrjUOjGQ2YJhMGm2IBOuEOx12WHoyGi+TK73K1WKZ3yGTK32KACE2Z8fv9AWxgbxQR1QF0lJJLKpEWpmBpXEpRqiEDoNDhZKoJg47JJ5vJiaSDkdSfRQgkstcymdbkyWWyOdyyrzfgDCkDmiD2uDEDplOqtWpzEodEs+vJlar1brpFrzDr5joDZSjRTfPRClcMsUAGoJfIAdWt3xdAqaXGFXs6iBMSjUShwcYJqrUCOY80kyrjVgsMkVzBbI02Sd8KcNGDAADcqIQIOQyPgoPRs9kEhn0hUkqUMubS0K2oQwVWEJD1UsTAjZRpIeZlYp+msW5qzCZsYrh3tyWPJ9PZ-PF8ucjXBIN2ZaIPg+fIil3D0KwPUVRDRdYMSURxrFrZRNlcW9mHvaRHxjZ9XyJLwSWTKdqF-EIlxXICQLOMCIKgt1BRg-dDzFUw4XVIN7DUWxJFsUYdGVBETAbSVzEGSRg3Q6R31wciZznKiANXK5gM3UJtyyaDyzY+CuhrNU3EVCwNCvF8dQjZhLEJPRdRQsZzM8Ej8G4CA4GEUk9xFb1unsesxnsNZg16AllR6BwFHkSU1GkfjdRi8x5LwIhSECWhIB8ysOO6UZmG7aRFTwlQ+JRIwJCUJRpBwIZEVUeEiq0eEUv8Mhp2CBdwiiWJKGyuC-PEDQYRwILrCKpwxhMCKiqsYYYQ0RQZDhFLP0pfr2IQhBbBq6U1EvBUlQq2ZpF2msqr0RxXCKjwSMNNaR0UiANoMtFzDE+LpDjJw2zw2ERN1bjpP2mEQb41bjWTYgnpevybpwfFNBbX0Lt6AGCq+4HsRlPQTAh1M9nHJ7lIXWGj3MfFaolNs+LiyUNmVanRpDeQhjjM9gpS4m-zJ3Khv6fiQyKmNNl1VUZvrawYT0HFz0UQkXPcIA */
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
            INITIALIZED_FROM_URL: {
              target: 'validating',
              actions: ['storeQuery', 'storeFilters'],
            },
          },

          invoke: {
            src: 'initializeFromUrl',
          },
        },

        hasQuery: {
          entry: ['updateQueryInUrl', 'updateQueryInSearchBar', 'updateFiltersInSearchBar'],
          invoke: [
            {
              src: 'subscribeToQuerySearchBarChanges',
            },
            {
              src: 'subscribeToFilterSearchBarChanges',
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
}

export const createLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews,
  {
    kibanaQuerySettings,
    queryStringService,
    toastsService,
    filterManagerService,
    urlStateStorage,
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
    },
  });

export type LogStreamQueryStateMachine = ReturnType<typeof createLogStreamQueryStateMachine>;
export type LogStreamQueryActorRef = OmitDeprecatedState<ActorRefFrom<LogStreamQueryStateMachine>>;
