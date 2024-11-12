/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import type {
  FilterManager,
  QueryStringContract,
  TimefilterContract,
} from '@kbn/data-plugin/public';
import { EsQueryConfig } from '@kbn/es-query';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { actions, ActorRefFrom, createMachine, SpecialTargets, send } from 'xstate';
import { DEFAULT_REFRESH_INTERVAL } from '@kbn/logs-shared-plugin/common';
import { OmitDeprecatedState, sendIfDefined } from '@kbn/xstate-utils';
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
  LogStreamQueryContextWithRefreshInterval,
  LogStreamQueryContextWithTime,
  LogStreamQueryContextWithTimeRange,
  LogStreamQueryContextWithValidationError,
  LogStreamQueryEvent,
  LogStreamQueryTypestate,
} from './types';
import {
  initializeFromUrl,
  safeDefaultParsedQuery,
  updateContextInUrl,
} from './url_state_storage_service';
import {
  initializeFromTimeFilterService,
  subscribeToTimeFilterServiceChanges,
  updateTimeContextFromTimeFilterService,
  updateTimeContextFromTimeRangeUpdate,
  updateTimeContextFromRefreshIntervalUpdate,
  updateTimeInTimeFilterService,
  updateTimeContextFromUrl,
} from './time_filter_state_service';
import { showValidationErrorToast, validateQuery } from './validate_query_service';
import { DEFAULT_REFRESH_TIME_RANGE } from './defaults';

export const createPureLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews & LogStreamQueryContextWithTime
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRAEYAHAGYck8QCYArAoAsC8QHZNygJySANCCwTpszc2njpANnH2FN1UtUBfV0bSZcxfhWo0xFAAYhjcALYAqhiU9ACSAHJxACpxAIIAMnEAWgCiACIA+sEASgDyALKFkSUZLOxIIDx8AkKNYghKzJJyCvJOurqqA4bGiPI4XczTdjbM2kq64u6e6Ng4vmRUtEGhEcmE4WDBhJQkmADKmABuhADGYPFJqZk5BcXlVakVucVxGclciVChcgQA1OIAYVy9WEzT8gmEHWkkhsOGmmnkqnUumkzBsmmkRhMCF0mjRunxCjM9nx0iUkhWIC8602-lokBwAEc1lh6MhIkCAJofSog3JpEqQgAShQAQpLCjK0gkAOIFWGNeGtJHjcRKHA2aR9BT45hKOxKIljBDiZiqcRyAmmySqV2aJSYpksnykdl0CDc3n0YL-QElC6iqqgyUy+WK5VqjVsOG8BFtUAdeQGo0ms0W-XWklLHrDZi6K3SbQ2SSe728jZ+7YBoPeej5NLJNKFCG5ADqkcT6vymq4aZ17T1OeNklNcwLVuJ4wUCnR83kgzd7vr3kbfmbnJ5u+u2wg5DI+Cg9DBrw7qTKCRBkUh0IKyYaY5ahERk9tDtUODSJSdj6uW4i6EupKqMwgGKEoijMCaZKMh4zINmyB6Bke6wntQZ4XleN5ZHecQPsUaT-O+qZfj+mYSP+gHAfYXRLBBNr2HMOBaOBfQbto5o7qyTYBIeDYYGAuGEPhQTXrenakY+wQURkVFauO34ZqI9HiABQH4sxYFsSSdq2Dg5IWoSmiKDY+jSIJvr7iJWFiRJp7njJRFxCRZEXM+r75Kpn7prqf46Yx+mgaxkH9DgwHKDZGgrha9l7lsTk4GQRz0N8vylGKOV-ACQLiiUELQkq0oqsOo5NOptFaQg2aGjOc7mpaRYSO6hoWho5YKBYHooasu4YelmWPJEAAKd6-AVJRVTCKZqTRmlZvqzV5vO7WQeIBIwdIqhVjWZLDHMNgpaNHKBuN9BTTNhQlLkpS5BcsqJOGRE1dqGkhU1uazvm23saouLolYxoWCuahKEoF3CVdGWHGAqX+gwX11atpgOpM1KnYdmIVqoO06LokwyGYh2SJo2KqJocOOQj40o5hTDiB+tUrSF1jYyoB02E4VaSITxOSD03Q0tTQFujo9NpYzSM4LAJDuXc9CTWk6qFLkCRFHKkTBMExWPWkMqBRzwW-rtFjosMQv0rSpqaDtVMAXauKYrO8HMDpsuo9dCtK+J5DhDJIhK+eyPkAAZucGAABTiVH4mwAAFgAlPy6Hwy2TOB2AwdBOjnOW4SpNC+6qICxuxMooBZgQ+aB2WO4qH4NwEBwMIPrURbdEIAAtDYkH9wagxj97tjDCuVZuKhPp4EQ2eQD3E59+oO3GmZli7dYnoMn0dNz1nDOBJeexRDEK8-b+-U9OXwyWVoLFE+x5Y4KaVjUkaihC7TvvNrsMI4QDhHBOGcS4Nx7hgCvvVDoBJIKDH2osKsVYKzgUGP-JyMDMYICsqTf6rUFwdQQCDGCcUpC6BNPIOyR8RpL2ct4bBIVySaA2gDLahZIKelLFSU0iE5hkkwQjbCuBJLSUvEwy2UhWF9EUMoLQbpJ4IJcJMICdpdrQ12kNNCdCT6iWPKeSRfddr80NBWPEQE5jYhsAoaKzgcDYkcKLZx28aHDSEnohhQkxFGIaiYtENkrSWF0FYqeO18QGjxBoQ69J6Solnu4hycsWwiJwOJMR7kJHLV7n46R795BJQUTIJwdiAICKAsaA+kh7RCJzkjXxHQWFsMIUDYyeI0RWmsALBCNZYa0I8ckzkTNLoBgaRIDQrCyQ2AZPpPhSga4ATUIMV0CgyT4nOv0pJftEZHEVsrMgdwxm2ngq7cxVp+aU3AiLNE9cG5Wmgm4nRAztm5xIEHEOWSgqrz8ScriZzbBVyuexHQrDyZWE9M4TQ+hD7uCAA */
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
            target: 'initializingFromTimeFilterService',
          },
        },

        initializingFromUrl: {
          on: {
            INITIALIZED_FROM_URL: {
              target: 'initialized',
              actions: ['storeQuery', 'storeFilters', 'updateTimeContextFromUrl'],
            },
          },
          invoke: {
            src: 'initializeFromUrl',
          },
        },
        initializingFromTimeFilterService: {
          on: {
            INITIALIZED_FROM_TIME_FILTER_SERVICE: {
              target: 'initializingFromUrl',
              actions: ['updateTimeContextFromTimeFilterService'],
            },
          },
          invoke: {
            src: 'initializeFromTimeFilterService',
          },
        },
        initialized: {
          type: 'parallel',
          states: {
            query: {
              entry: ['updateContextInUrl', 'updateQueryInSearchBar', 'updateFiltersInSearchBar'],
              invoke: [
                {
                  src: 'subscribeToQuerySearchBarChanges',
                },
                {
                  src: 'subscribeToFilterSearchBarChanges',
                },
              ],
              initial: 'validating',
              states: {
                validating: {
                  invoke: {
                    src: 'validateQuery',
                  },
                  on: {
                    VALIDATION_SUCCEEDED: {
                      target: 'valid',
                      actions: 'storeParsedQuery',
                    },

                    VALIDATION_FAILED: {
                      target: 'invalid',
                      actions: [
                        'storeValidationError',
                        'storeDefaultParsedQuery',
                        'showValidationErrorToast',
                      ],
                    },
                  },
                },
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
                  actions: ['storeQuery', 'updateContextInUrl'],
                },

                FILTERS_FROM_SEARCH_BAR_CHANGED: {
                  target: '.revalidating',
                  actions: ['storeFilters', 'updateContextInUrl'],
                },

                DATA_VIEWS_CHANGED: {
                  target: '.revalidating',
                  actions: 'storeDataViews',
                },
              },
            },
            time: {
              initial: 'initialized',
              entry: ['notifyTimeChanged', 'updateTimeInTimeFilterService'],
              invoke: [
                {
                  src: 'subscribeToTimeFilterServiceChanges',
                },
              ],
              states: {
                initialized: {
                  always: [{ target: 'streaming', cond: 'isStreaming' }, { target: 'static' }],
                },
                static: {
                  on: {
                    PAGE_END_BUFFER_REACHED: {
                      actions: ['expandPageEnd'],
                    },
                  },
                },
                streaming: {
                  after: {
                    refresh: { target: 'streaming', actions: ['refreshTime'] },
                  },
                },
              },
              on: {
                TIME_FROM_TIME_FILTER_SERVICE_CHANGED: {
                  target: '.initialized',
                  actions: [
                    'updateTimeContextFromTimeFilterService',
                    'notifyTimeChanged',
                    'updateContextInUrl',
                  ],
                },

                UPDATE_TIME_RANGE: {
                  target: '.initialized',
                  actions: [
                    'updateTimeContextFromTimeRangeUpdate',
                    'notifyTimeChanged',
                    'updateTimeInTimeFilterService',
                    'updateContextInUrl',
                  ],
                },

                UPDATE_REFRESH_INTERVAL: {
                  target: '.initialized',
                  actions: [
                    'updateTimeContextFromRefreshIntervalUpdate',
                    'notifyTimeChanged',
                    'updateTimeInTimeFilterService',
                    'updateContextInUrl',
                  ],
                },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        notifyInvalidQueryChanged: actions.pure(() => undefined),
        notifyValidQueryChanged: actions.pure(() => undefined),
        notifyTimeChanged: actions.pure(() => undefined),
        storeQuery: actions.assign((_context, event) => {
          return 'query' in event ? ({ query: event.query } as LogStreamQueryContextWithQuery) : {};
        }),
        storeFilters: actions.assign((_context, event) =>
          'filters' in event ? ({ filters: event.filters } as LogStreamQueryContextWithFilters) : {}
        ),
        storeTimeRange: actions.assign((_context, event) =>
          'timeRange' in event
            ? ({ timeRange: event.timeRange } as LogStreamQueryContextWithTimeRange)
            : {}
        ),
        storeRefreshInterval: actions.assign((_context, event) =>
          'refreshInterval' in event
            ? ({
                refreshInterval: event.refreshInterval,
              } as LogStreamQueryContextWithRefreshInterval)
            : {}
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
        updateTimeContextFromTimeFilterService,
        updateTimeContextFromTimeRangeUpdate,
        updateTimeContextFromRefreshIntervalUpdate,
        refreshTime: send({ type: 'UPDATE_TIME_RANGE', timeRange: DEFAULT_REFRESH_TIME_RANGE }),
        expandPageEnd: send((context) => ({
          type: 'UPDATE_TIME_RANGE',
          timeRange: { to: context.timeRange.to },
        })),
        updateTimeContextFromUrl,
      },
      guards: {
        isStreaming: (context, event) =>
          'refreshInterval' in context ? !context.refreshInterval.pause : false,
      },
      delays: {
        refresh: (context, event) =>
          'refreshInterval' in context
            ? context.refreshInterval.value
            : DEFAULT_REFRESH_INTERVAL.value,
      },
    }
  );

export interface LogStreamQueryStateMachineDependencies {
  kibanaQuerySettings: EsQueryConfig;
  queryStringService: QueryStringContract;
  filterManagerService: FilterManager;
  urlStateStorage: IKbnUrlStateStorage;
  toastsService: IToasts;
  timeFilterService: TimefilterContract;
}

export const createLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews & LogStreamQueryContextWithTime,
  {
    kibanaQuerySettings,
    queryStringService,
    toastsService,
    filterManagerService,
    urlStateStorage,
    timeFilterService,
  }: LogStreamQueryStateMachineDependencies
) =>
  createPureLogStreamQueryStateMachine(initialContext).withConfig({
    actions: {
      updateContextInUrl: updateContextInUrl({ toastsService, urlStateStorage }),
      // Query
      notifyInvalidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        logStreamQueryNotificationEventSelectors.invalidQueryChanged
      ),
      notifyValidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        logStreamQueryNotificationEventSelectors.validQueryChanged
      ),
      showValidationErrorToast: showValidationErrorToast({ toastsService }),
      updateQueryInSearchBar: updateQueryInSearchBar({ queryStringService }),
      updateFiltersInSearchBar: updateFiltersInSearchBar({ filterManagerService }),
      // Time
      updateTimeInTimeFilterService: updateTimeInTimeFilterService({ timeFilterService }),
      notifyTimeChanged: sendIfDefined(SpecialTargets.Parent)(
        logStreamQueryNotificationEventSelectors.timeChanged
      ),
    },
    services: {
      initializeFromUrl: initializeFromUrl({ toastsService, urlStateStorage }),
      initializeFromTimeFilterService: initializeFromTimeFilterService({ timeFilterService }),
      validateQuery: validateQuery({ kibanaQuerySettings }),
      subscribeToQuerySearchBarChanges: subscribeToQuerySearchBarChanges({
        queryStringService,
      }),
      subscribeToFilterSearchBarChanges: subscribeToFilterSearchBarChanges({
        filterManagerService,
      }),
      subscribeToTimeFilterServiceChanges: subscribeToTimeFilterServiceChanges({
        timeFilterService,
      }),
    },
  });

export type LogStreamQueryStateMachine = ReturnType<typeof createLogStreamQueryStateMachine>;
export type LogStreamQueryActorRef = OmitDeprecatedState<ActorRefFrom<LogStreamQueryStateMachine>>;
