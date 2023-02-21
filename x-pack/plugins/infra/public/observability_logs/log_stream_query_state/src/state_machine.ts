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
import { DEFAULT_REFRESH_INTERVAL, DEFAULT_REFRESH_TIME_RANGE } from './defaults';

export const createPureLogStreamQueryStateMachine = (
  initialContext: LogStreamQueryContextWithDataViews & LogStreamQueryContextWithTime
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRAEYAHAGYck8QCYArAoAsC8QHZNygJySANCCwTpszc2njpANnH2FN1UtUBfV0bSZcxfhWo0xFAAYhjcALYAqhiU9ACSAHJxACpxAIIAMnEAWgCiACIA+sEASgDyALKFkSUZLOxIIDx8AkKNYghKzJJyCvJOurqqA4bGiPI4XczTdjbM2kq64u6e6Ng4vmRUtEGhEdGxiSnpWXlFpZXVtYziDVy8foLCHSpGJgjizj02SjYa3X0dH8ViAvOtNv4dvgQmFwslCOEwMFCJQSJgAMqYABuhAAxmB4klUpkcgViuUqqkKrlinEMslciVCujGQA1OIAYVy9WEzUebVAHWkkhsOGmmnkqnUumkzBsmmkb0Quk0ot0coUZnscukSkkILBPlIkLoEBwAEc1lh6MhIoyAJrky4stIlDkACUKACFXYUPWkEgBxAo8xp81rPcbiJQ4GzSPoKOXMX7RxVjD7MVTiOTyxOSVT5zRKCUGq0bY3bU0Wq30YJ0hkldFOqout2en1M-1BkNsXkPCPtKMxuMJpMppRp95LHrDZi6CfSbQ2STF0vect+SuQaveej5NLJNKFdm5ADqTa7wfyofuLUIT0HCHkw-jkkTc3Hk-GCgUYvm8kGAtCzXcEKwCbdLXXLFtggcgyGhehWRJfdUjKBJmUiDkuQKHs7iaft7wFUQJCzVQcGkdU7GjOdxF0JUECGZhyMUJRFGYBMVX1DxQTLCEtzNSD1mg6hYPgqBEOQg84jQ4o0jpXC+zvB9BRIz5yMo+wuiWOj03sOYcC0Wi+gA7RkxAo1N3AgSywwMBhMIUSggkrIUOk9DgjkjIFLDAjlOIj5SPUuVNJonT3nESxRVVX4FU0RQbH0aRzI3LYrJ3dZbPsxyEKQlypJk9FMOw-JvNvflIwCtSKOC6jtPo-ocEo5QEo0H9fmSvi0rIRF6CpGkLkpOJqVpelGWZNlORpS9SvwpSiI6Z9Y1fd9kzsCd6KkVRNFjX5-l0BQLCLLjVnXTraG3bqCUiAAFFCaT6woSgDYMb1m8rH0Wkc3zHNavw+eUmOkVRF2XFVhjmGwOrA86zUu+gbrux7clKXJ0U9RIG1y17w0IirPuWn7Uw21QZTFKx4wsH81CUJQocsmGcEulKTQYbHfPm0ws0mTVweBiV51UDadF0SYZDMYHJE0KUtrp1KGaZs7TSYW5FPelSPiB7MVCBmwnEXSQBaFyQem6LUpYogsdHcbj8G4CA4GEQ1VYHdWAFobHo12Y0GH3fb9pLuMNPAiGh01ndxx91A2+McAsKw7F1I7AVlk1dlhA5w78joDp6A383lRctC0wXdLnHBEysTU40UA2ZcD3jQ7TiJ4URZFUQxbE8TATOOYQeV6MGQHFkXRd51owYU-4nuKrikWvpWz96JJpimrsRwJQLaNJ7SwT3jKl3-NVbb58J9b02LGcNXJn8Cx+beGd3nAsrgoJp8fexJfL+Q2q0AtbBLqcLhJgUQiuIP4zgwHHR4qdUOEEyxZTfurMButYzzllBROYUo-j1WcDgKUjhjaEMsNYe+VZH7EAQT5OaFVkGigShOSwuhMHDAUBtOUMZZQaGBrqXUIo3D1xgfTMhNk7IwRftCRB-kP7bT6IoZQv8ZBOBwWROYMoZQ-klpITMpCLoIm7lQtWh95RLVHB+X60cY4TmsOqQuqot4CNAkI3RiJmZTwMQfDoigtCNWilote0wlBCyBuXEm+hpQWF1jo2GeicCwBIC-XEkjPGsTIrRCcE5dYS1okbUUZgzAHWTEDSwUTGYxLibZcg4RX7uIjkglJBk0EZL1gBIWB05B5OjFLYs+hNDW1cEAA */
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
              entry: [
                'notifyTimeChanged',
                'updateTimeInTimeFilterService',
                'setDefaultRefreshInterval',
              ],
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
        setDefaultRefreshInterval: actions.assign(
          (_context, _event) =>
            ({
              refreshInterval: {
                value: 5000,
                pause: false,
              },
            } as LogStreamQueryContextWithRefreshInterval)
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
        expandPageEnd: send({ type: 'UPDATE_TIME_RANGE', timeRange: { to: 'now' } }),
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
