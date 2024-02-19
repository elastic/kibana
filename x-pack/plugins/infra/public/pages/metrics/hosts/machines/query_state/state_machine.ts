/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FilterManager,
  QueryStringContract,
  TimefilterContract,
} from '@kbn/data-plugin/public';
import { EsQueryConfig } from '@kbn/es-query';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { actions, ActorRefFrom, createMachine, SpecialTargets } from 'xstate';
import { sendIfDefined } from '../../../../../observability_logs/xstate_helpers';
import { hostsViewQueryNotificationEventSelectors } from './notifications';
import {
  subscribeToFilterSearchBarChanges,
  subscribeToQuerySearchBarChanges,
  updateFiltersInSearchBar,
  updateQueryInSearchBar,
} from './search_bar_state_service';
import type {
  HostsViewQueryContext,
  HostsViewQueryContextWithDataView,
  HostsViewQueryContextWithFilters,
  HostsViewQueryContextWithPanelFilters,
  HostsViewQueryContextWithParsedQuery,
  HostsViewQueryContextWithQuery,
  HostsViewQueryContextWithTime,
  HostsViewQueryContextWithValidationError,
  HostsViewQueryEvent,
  HostsViewQueryTypestate,
} from './types';
import {
  initializeFromUrl,
  safeDefaultParsedQuery,
  updateFilterContextInUrl,
  updateControlPanelsContextInUrl,
} from './url_state_storage_service';
import {
  initializeFromTimeFilterService,
  subscribeToTimeFilterServiceChanges,
  updateTimeContextFromTimeFilterService,
  updateTimeContextFromTimeRangeUpdate,
  updateTimeInTimeFilterService,
  updateTimeContextFromUrl,
} from './time_filter_state_service';
import {
  updateControlsContextFromControlPanelsUpdate,
  updateControlPanelsContextFromUrl,
} from './custom_controls_state_service';
import { validateQuery } from './validate_query_service';

export const createPureHostsViewQueryStateMachine = (
  initialContext: HostsViewQueryContextWithTime & HostsViewQueryContextWithDataView
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEUCuYBOBPAdKgdgJZEAuhAhgDaEBekAxANoAMAuoqAA4D2shZ3fBxAAPRAEYAHAGYck8QCYALJIBs45vOnNxSgDQgsE5qpzNzzJaoCsS6eMVKFAX2cG0mXMX4VqNYlAAYhjcALYAqhiU9ACSAHIxACoxAIIAMjEAWgCiACIA+oEASgDyALL54UVpLOxIIDx8AkL1YgjWCgZGCA4mOACcCv2SAOyqapLWzNbWru7o2DjeZFS0AcFhAMqYAG6EAMZwsQnJ6Vl5haUVyWXZhTFpidlF+ZvPAGoxAMLZtcKNPkEwjaHS6iGkkkkZgU0iUIxGUnEI2kwzmIA8iwA7uR+IFuBgvoISCFKAAFcj4MCUWAxUi+WjkZr0CCCMA4WAkRlsjG4bG4-GE-DE7hkilUml01Y0RmEQR-eoA5rAiTiaSmZj2BQjKYjJwazqGFWTHCakYKSzyazSGZonk4PkkPEEokk8mU6m0nxSmWCHCUbjkCCC4XU+jhUm5FJPfJfEpxRKlNL5UkpOLZNKbeVcXiAlqgEFKaw4OE2EbyGQwpFgnowqHSNUKJFmhQKSR2W0LXk4x0Cl0it3iz0rPw+-B+gMQAeUQKESgkTCwegptNJwIPJ5FTYxgASqYA4nksw0c0rWohbEWS9Yy1JpJWRtWHLoBkMZKo7NZIdaO54lpK-JAOAAI6dvQyDhM8ACalzlK82QpEUXzbvkABCCE7vuh5sP8J6ynmogSPYzA4Ko-RWtYqojMMqiqA+ho9FYxHDHCkg6P0NEKDabjop2f5egBEDAaBa6PM8W7FLBbwIUhqHoUhmG5Eeip4cqPRESRZHWpR1G0Y+9YjDg16TBR1j9GM9g-osyz0nQgkgZ4S6pum9yiZuGFxAeinYQquFAmeakaBp5HaWoun0Yoz5IjCLb9NRaojJZXj-rQgH2YsOyrBAMr4FA9DvGckbJHGrzhF8Px5FhdTZk0Kn+eI-TMP0xZWg477KIx+jhbCRaadYpFWEMCIJdxdrWVKqW8Rl1BZWQOV5QVUYxMVgQpA8lU4TVfn5hIDVNYW9jiG1SgdY+VpQpMZnSPCqgtjIw3zL+Y0CUJv4YGAU2EDNATzRkhVLXEhSrWk60+Zt+FtPVjXNQdR0neFx0KMWJhTI1nEtqqiV8cOKV2bxb0fV9c35b9i3FZspXlbkIPVbmqmQ3tLWHU4x2qJYj4tojtjIkomiqCi8KSJjT04zg+x9qK7qLuGhV3LG8aJsmTkZkpvng4RgWkcFV06XR3SIlCYzqNo16tbMI28cLtk4GQoRgPQNx3BJ1wxLcLkbnBRSfD87meSrYN0+pmtadroW64grGyJqNhmcM1rqELyVWzbdvS1GdwO-kRSYX7tN1YHvUhTRYcIDd6rmLoMLmOMFGuNx+DcBAcDCDyG259tCAALSqNWHc9bF-cDwP0iYwQluQK3p7t04j6WAM-ekQ4Iw6A4ZsPVZifrCEERRBPtVT42JHKP0djaOoUiSNWEJQhYJhwhRgz9Bj5uPRvOUbKE2wYHshzwKDbcEQgLU51mIqG5roPm1Z5CGRvsbDohYFCqExg6J0wZXRig9InUcu8toALvAZHQfUeYIOOvqbu9FhjEScMMI+qoeb1iQd2FB4spwSn4gyZootxawDSBOcef9J4AMfojG8rY1SfgRMfR84gKJyBkA4JQMdH5WAYfyZ0Qo0GSyHDZUcOBODoJnHOBcPDAx8JpgItoQicAiLfOI+qnU9atgNtHQYugzTyCUConsaiQwsK0d6Dh-pAyoJFL-Mxe9cHDBNNqNiKIbBWHZpCKxNgZDH1MqMFQnimHqP7Og1h2NpQBInFOAx84MChOPP7fyV0iwEPfMwYhdCEFSJkZCIYN0hicU0AnNhtlsFqxrM+IOFEQ5F0vh0MwFh3zanqkMJ+a8ko9Imp4PpdMEGIyGYXMK3QzJFloo2YysJGpWm6fkpZ6VMrZSgCsuq4xEawmqVIMs5gzJ6VZjgKQ5cBqTGtC4Z+69Fm41-ATa57dGzqCsdeMswwHANTIQ4mRmgrq0X6JqKw90eIvwBS9dewL+HhLaGC8QEKBbQshnCiQhYDJWHfHeJ8cD0WjUTmc3A+MLmzSuXinBENbkmjsNM0YrFGrF0UFMHAnSIRXXqU+YefyFmnMEmLbJEtxQgoAYoG6QVg5UVDo+cYSgxXRxomqRQZYTk2UAoqnxuSsbmogKq7lZYJnmD6gc2w9iJBqCavVT8rYbDKHEWa8aglk72okGszVwztWjPonYJqKNdBKGkZoa6q8MX-PldbQgtsbVBtDT0BEsgNSwskEMa8j9qykQMtIvmRlPxWFRLXIAA */
  createMachine<HostsViewQueryContext, HostsViewQueryEvent, HostsViewQueryTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'Query',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: {
            target: 'initializingFromServices',
          },
        },
        initializingFromUrl: {
          on: {
            INITIALIZED_FROM_URL: {
              target: 'initialized',
              actions: [
                'storeQuery',
                'storeFilters',
                'storePanelFilters',
                'updateTimeContextFromUrl',
                'updateControlPanelsContextFromUrl',
              ],
            },
          },
          invoke: {
            src: 'initializeFromUrl',
          },
        },
        initializingFromServices: {
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
              entry: [
                'updateFilterContextInUrl',
                'updateQueryInSearchBar',
                'updateFiltersInSearchBar',
              ],
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
                      actions: ['storeValidationError', 'storeDefaultParsedQuery'],
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
                QUERY_FROM_SEARCH_BAR_CHANGED: {
                  target: '.revalidating',
                  actions: ['storeQuery', 'updateFilterContextInUrl'],
                },
                FILTERS_FROM_SEARCH_BAR_CHANGED: {
                  target: '.revalidating',
                  actions: ['storeFilters', 'updateFilterContextInUrl'],
                },
                PANEL_FILTERS_CHANGED: {
                  target: '.revalidating',
                  actions: ['storePanelFilters', 'updateFilterContextInUrl'],
                },
              },
            },
            controlPanels: {
              initial: 'initialized',
              entry: ['notifyControlPanelsChanged'],
              states: {
                initialized: {},
              },
              on: {
                UPDATE_CONTROL_PANELS: {
                  target: '.initialized',
                  actions: [
                    'updateControlsContextFromControlPanelsUpdate',
                    'notifyControlPanelsChanged',
                    'updateControlPanelsContextInUrl',
                  ],
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
                initialized: {},
              },
              on: {
                TIME_FROM_TIME_FILTER_SERVICE_CHANGED: {
                  target: '.initialized',
                  actions: [
                    'updateTimeContextFromTimeFilterService',
                    'notifyTimeChanged',
                    'updateFilterContextInUrl',
                  ],
                },
                UPDATE_TIME_RANGE: {
                  target: '.initialized',
                  actions: [
                    'updateTimeContextFromTimeRangeUpdate',
                    'notifyTimeChanged',
                    'updateTimeInTimeFilterService',
                    'updateFilterContextInUrl',
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
        notifyControlPanelsChanged: actions.pure(() => undefined),
        storeQuery: actions.assign((_context, event) => {
          return 'query' in event ? ({ query: event.query } as HostsViewQueryContextWithQuery) : {};
        }),
        storeFilters: actions.assign((_context, event) =>
          'filters' in event ? ({ filters: event.filters } as HostsViewQueryContextWithFilters) : {}
        ),
        storePanelFilters: actions.assign((_context, event) =>
          'panelFilters' in event
            ? ({ panelFilters: event.panelFilters } as HostsViewQueryContextWithPanelFilters)
            : {}
        ),
        storeValidationError: actions.assign((_context, event) =>
          'validationError' in event
            ? ({
                validationError: event.validationError,
              } as HostsViewQueryContextWithValidationError)
            : {}
        ),
        storeDefaultParsedQuery: actions.assign(
          (_context, _event) =>
            ({ parsedQuery: safeDefaultParsedQuery } as HostsViewQueryContextWithParsedQuery)
        ),
        storeParsedQuery: actions.assign((_context, event) =>
          'parsedQuery' in event
            ? ({ parsedQuery: event.parsedQuery } as HostsViewQueryContextWithParsedQuery)
            : {}
        ),
        clearValidationError: actions.assign(
          (_context, _event) =>
            ({ validationError: undefined } as Omit<
              HostsViewQueryContextWithValidationError,
              'validationError'
            >)
        ),
        updateControlsContextFromControlPanelsUpdate,
        updateControlPanelsContextFromUrl,
        updateTimeContextFromTimeFilterService,
        updateTimeContextFromTimeRangeUpdate,
        updateTimeContextFromUrl,
      },
    }
  );

export interface HostsViewQueryStateMachineDependencies {
  kibanaQuerySettings: EsQueryConfig;
  queryStringService: QueryStringContract;
  filterManagerService: FilterManager;
  urlStateStorage: IKbnUrlStateStorage;
  timeFilterService: TimefilterContract;
}

export const createHostsViewQueryStateMachine = (
  initialContext: HostsViewQueryContextWithTime & HostsViewQueryContextWithDataView,
  {
    kibanaQuerySettings,
    queryStringService,
    filterManagerService,
    urlStateStorage,
    timeFilterService,
  }: HostsViewQueryStateMachineDependencies
) =>
  createPureHostsViewQueryStateMachine(initialContext).withConfig({
    actions: {
      updateFilterContextInUrl: updateFilterContextInUrl({ urlStateStorage }),

      // Query
      notifyInvalidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        hostsViewQueryNotificationEventSelectors.invalidQueryChanged
      ),
      notifyValidQueryChanged: sendIfDefined(SpecialTargets.Parent)(
        hostsViewQueryNotificationEventSelectors.validQueryChanged
      ),
      updateQueryInSearchBar: updateQueryInSearchBar({ queryStringService }),
      updateFiltersInSearchBar: updateFiltersInSearchBar({ filterManagerService }),

      // Time
      updateTimeInTimeFilterService: updateTimeInTimeFilterService({ timeFilterService }),
      notifyTimeChanged: sendIfDefined(SpecialTargets.Parent)(
        hostsViewQueryNotificationEventSelectors.timeChanged
      ),

      // Custom controls
      updateControlPanelsContextInUrl: updateControlPanelsContextInUrl({ urlStateStorage }),
      notifyControlPanelsChanged: sendIfDefined(SpecialTargets.Parent)(
        hostsViewQueryNotificationEventSelectors.controlPanelsChanged
      ),
    },
    services: {
      initializeFromUrl: initializeFromUrl({ urlStateStorage }),
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

export type HostsViewQueryStateMachine = ReturnType<typeof createHostsViewQueryStateMachine>;
export type HostsViewQueryActorRef = ActorRefFrom<HostsViewQueryStateMachine>;
