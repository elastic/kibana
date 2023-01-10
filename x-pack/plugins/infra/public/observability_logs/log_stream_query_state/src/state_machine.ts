/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import type { FilterManager, QueryStringContract } from '@kbn/data-plugin/public';
import { EsQueryConfig } from '@kbn/es-query';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { actions, ActorRefFrom, createMachine, SpecialTargets } from 'xstate';
import { OmitDeprecatedState, sendIfDefined } from '../../xstate_helpers';
import { logStreamQueryNotificationEventSelectors } from './notifications';
import {
  subscribeToFilterSearchBarChanges,
  subscribeToQuerySearchBarChanges,
  updateFiltersInSearchBar,
  updateQueryInSearchBar,
} from './search_bar_state_service';
import type {
  LogStreamQueryContext,
  LogStreamQueryContextWithDataViews,
  LogStreamQueryContextWithFilters,
  LogStreamQueryContextWithParsedQuery,
  LogStreamQueryContextWithQuery,
  LogStreamQueryContextWithValidationError,
  LogStreamQueryEvent,
  LogStreamQueryTypestate,
} from './types';
import {
  initializeFromUrl,
  safeDefaultParsedQuery,
  updateFiltersInUrl,
  updateQueryInUrl,
} from './url_state_storage_service';
import { showValidationErrorToast, validateQuery } from './validate_query_service';

export const createPureLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRAFoATAHZJOAMwBWJQBYAjNIBszAJwAOTZIA0ILBMnyca+Wp2bFenfL1b5zTQF8PJtJlzF+CmoaYigAMQxuAFsAVQxKegBJADlEgBVEgEEAGUSALQBRABEAfTCAJQB5AFkSmPLslnYkEB4+ASEWsQRxeRU5PXdNA001RX1tRRMzBBkdHHVmFWZpHTVJC2ZFFS8fdGwcAAtyWF9semQYgvKATTKq2oBlAszygGEACRKAIVeSz8yyQA4sUmsI2oFBMJupIVNIcLoVHpBoppLJFMZTIh7DgdMsnNINHZlip5LsQGdcMdTvssPQwolsmlro97jUSs9Xp8fn8AcDQWxwbxIZ1QN1tHICWoXJJNDoMfJ5NNsYpcfj5ITVpoSZ5vBTaUcTpT6EVMmlMiUAGqJAoAdVZfJBRTBLQhHWhiDscllKwsKnUOmYajUyoQqysmmkKh00mYbijjkU5MphppfhwGDAADcqIQIOQyPgoPRLTlEqaMpVkmVMoyBc0uML3V1PZHcfK1P6UXY0aG3JZ5Pp1WpRgZJEm9SnqSnMznqPnC8XS7kK4kqxyYm83gVivWhe1CFCWwhB8wFjJRvJJINZZHpH24woh7obKPDBO9um53mC6ES2XV3XR5N23XdnUFV0m0PUVRAkNZcVkUY8UUQxmDjPRQ39NQcCjNENUkWwVEUJZpGTA1vwXP9l3LM012rMJa2yPdIIPI8xQkaRLB0CZiO2aQ9EkJxQxQ1UBKUZg9HWUl1FI8l8G4CA4GESl9xFD0elPHBBk0YYdLGCYtlDKRtARcYtivFw0S0Mj0wIAIyFzOgIFU5t2J6QS9BwDYVmlHRYR0rZNCMjRsJHST-RE8dOJ2ScDXsoJaFCCJojiSgXOg9Ten6LzI1GawrKvWFQ07SxZE41Y1jsawP31dNp1pdK2NghBbHmRFkS2NFx0xGZxA0ORFDMyMPNWcYbIOeqv1zZyWLU48NWwyqtTcXQ9FJTDlgQ-pkW1HbJPGqkjTi-AKMamDuj8lQEWlBwVAlWUrw2s8Y22gwkQMfbYrqo701nabfyLM71NjbCBOWCTfLhdxQ1hM9ZScPQNW4xQR2sA6cAogGoCB49eiULTL1RPQMUDQcpixBB-WeqNx2lIlEdkrwgA */
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
                  actions: ['storeValidationError', 'showValidationErrorToast'],
                },
                VALIDATION_SUCCEEDED: {
                  target: 'valid',
                  actions: ['clearValidationError', 'storeParsedQuery'],
                },
              },
            },
          },
          on: {
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
              actions: [
                'storeValidationError',
                'storeDefaultParsedQuery',
                'showValidationErrorToast',
              ],
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
      showValidationErrorToast: showValidationErrorToast({ toastsService }),
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
    },
  });

export type LogStreamQueryStateMachine = ReturnType<typeof createLogStreamQueryStateMachine>;
export type LogStreamQueryActorRef = OmitDeprecatedState<ActorRefFrom<LogStreamQueryStateMachine>>;
