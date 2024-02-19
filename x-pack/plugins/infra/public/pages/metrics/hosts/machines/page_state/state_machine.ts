/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '@kbn/es-query';
import { actions, ActorRefFrom, createMachine, EmittedFrom } from 'xstate';
import { datemathToEpochMillis, parseDateRange } from '../../../../../utils/datemath';
import { MatchedStateFromActor } from '../../../../../observability_logs/xstate_helpers';
import {
  createHostsViewQueryStateMachine,
  DEFAULT_TIMERANGE,
  HostsViewQueryStateMachineDependencies,
} from '../query_state';
import { waitForInitialQueryParameters } from './initial_parameters_service';
import type {
  HostsViewPageContext,
  HostsViewPageContextWithControlPanels,
  HostsViewPageContextWithDataView,
  HostsViewPageContextWithDataViewError,
  HostsViewPageContextWithFilters,
  HostsViewPageContextWithPanelFilters,
  HostsViewPageContextWithQuery,
  HostsViewPageContextWithQueryParseError,
  HostsViewPageContextWithTime,
  HostsViewPageEvent,
  HostsViewPageTypestate,
} from './types';
import { DataViewNotificationChannel } from '../data_view_state';

export const createPureHostsViewPageStateMachine = (initialContext: HostsViewPageContext = {}) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QAsD2sAusBqBLMA7gAoCGMAyhiRmAHQCuAdrsxriQDa4BekAxABkA8gEEAIgEkAcgHEA+mJEAVEXOwSAogHU55FQCUlGsQG0ADAF1EoAA7pcbVI2sgAHogCMADgDMtLx4ATACsZgCcAGweEcEA7CFeADQgAJ6IgYFhtME+YXnBACyFZsHewQC+5clomDj4xGRglNR0TCwO7Fy8EIKikrIKyqrq2nIAYiISAsbmVkggdrAdTi7uCPHJaQgR4bQFYT4eHj4+gRGBsQWBldXoWHiEpBRUNAzMrJ08-MLi0vKKKjUmh05AAqgBhcEaYwzSwuRbLZzzNbePwBELhKIxeLBJKpdJeMy0MwFMxmHxmWJhXFeCpVEA1e71J5NF50DioEgQFhQMTUEgPAi9X4DAHDYHjSbTUxw+YIxxI0BrQIFPyxOIBWIRKJmTK+TaIdV+QIeMKxMlHHxeQJeLw3Bl3OqPRrNV4crk8vlUQXC-r-IZA0ZgyHQsSwua2ewK1bpVW0dWxTXajy6sL6-EIPIFWgmgpFC6nLxhDyxe2Mp0NZ4tWjIEiwL0C+oSRjcgDGcFo7TYnB4PIAivQwAAnFJ8fQaKESbDGOTSCRKCQiARyPugjT6ACaciIIn0IgAshojPpyLN4VHcCtkYh8rQovFMcWgqcDQgPPsPHfvBlMjEzBEwgKMtHUFFlXToWt635QVmzbDsu0+bh+0HEc+GwJcJDEFc103ORwQACREWRw3PJZo2vBBCSJRNQkCU5gkAgoIliV9ji8CJiRiHxYipCkHyA+ly1Al02RrOsGxgltcHbWBOw+HskMYKAB2HUdpHQgRMOw9ctwIoiZBIuULyvJVDSpPZuNiDxClyAC8S2IIImzEoogLfYLjNYDamEqtXkgiSmykmS5I6BTkNUvgF0PPDCOImUIwWYzFTcQ0Ck-CIvAKdVSRowCfFY6Jggs6ywnCU19k8wSQOZETq386DArg2SELCpSVNQ8EhCkJR9CEZcdykDQBHIGL9MMyMyMvZK1gAoqrJiACfGCQJKQiVjySKyli1tFzQm1LymWdXyIPEhrCFg6T4PkrpwtQgahvGKZjxGvS4rPIzJpMlLtic2hchKdUVtyJiwlfMIVr+ikAMA8IrXYg6KzA0T6u9RrLua66vh6DStNXHTRre2UJsRGM3249LSTiRNImpezPCuIki2siJuLJK4fAE25vJq46xKg1HzqCq7Qq6fh1IwrC8dw16DPi0iSYo45ft1DmgjS6l4hYjNjhVCzMoCEsyQ5nwEZ81k6tOgWCAu4KWtFnooo0AnZfe4nyNMt9ST8NNyVKostRZ4JWIyWJaDTHI0xZyJ81Nnnzb8y3G0FpqQu7e2+FBIgASdx25D3YjXcSz7ps8biOK8RNbXfMlCiygrDmyU5Dh1cHggiWOjvjk7+aT62hYxkWsb4Trut6-qiKGl7Ypdomi4Vj3jhyWg1fyDITgKTL1qW4kqXfEJVaYk2qu5zvwL5gLk-R1PEP4TPs7wrqer67cJ+Gwv5Sm0mlc-Es2-NJWThmjBlaO8IRIhFgYuSACHdKxd3PmdPuKc7ZD3usuMYT11xTzGnLD689vpKyKm3FmWVMhpROPlDMAQiommjvRWkup272kYKgCAcAXBCTjuBeW7tvoAFo1oZmpMSTmDoT6wLPm0TG3RuGfwolcV8dEiQkgtNaaydFTR0i5odcRol3TciUhfAgMivozS1lsRMfgjiZCOKqYseQj5aMRrVN0nJ9G8gQWMEguAOCQGMSXBARRPww3YlqI41laSvi9tkKy759guVtJo0R2ikYWx7pJJqfjSbBFKF+KysRDikickWV8GVqKmkWqcDKRwYEpITmktGtspG3S2G7WRHsGJZHvCWAp-4N6g21jkDiZJwi4nyRlUoDiklON5ijXuNthZpyxpkxWqoiS4lNDaQ4Jx4gFFYnEDiGJqQkgCNqE0lRKhAA */
  createMachine<HostsViewPageContext, HostsViewPageEvent, HostsViewPageTypestate>(
    {
      context: initialContext,
      predictableActionArguments: true,
      invoke: {
        src: 'dataViewNotifications',
      },
      id: 'hostsViewPageState',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          on: {
            LOADING_DATA_VIEW_STARTED: {
              target: 'loadingDataView',
            },
            LOADING_DATA_VIEW_FAILED: {
              target: 'loadingDataViewFailed',
              actions: 'storeDataViewError',
            },
            LOADING_DATA_VIEW_SUCCEEDED: {
              target: 'hasDataViewIndices',
              actions: 'storeDataView',
            },
          },
        },
        loadingDataView: {
          on: {
            LOADING_DATA_VIEW_FAILED: {
              target: 'loadingDataViewFailed',
              actions: 'storeDataViewError',
            },
            LOADING_DATA_VIEW_SUCCEEDED: {
              target: 'hasDataViewIndices',
              actions: 'storeDataView',
            },
          },
        },
        loadingDataViewFailed: {},
        hasDataViewIndices: {
          initial: 'initializingQuery',
          states: {
            initializingQuery: {
              invoke: {
                src: 'waitForInitialQueryParameters',
                id: 'waitForInitialQueryParameters',
              },
              on: {
                RECEIVED_INITIAL_QUERY_PARAMETERS: {
                  target: 'initialized',
                  actions: [
                    'storeFilters',
                    'storeQuery',
                    'storeTime',
                    'storePanelFilters',
                    'storeControlPanels',
                  ],
                },
                VALID_QUERY_CHANGED: {
                  target: 'initializingQuery',
                  internal: true,
                  actions: 'forwardToInitialQueryParameters',
                },
                INVALID_QUERY_CHANGED: {
                  target: 'initializingQuery',
                  internal: true,
                  actions: ['storeValidationError', 'forwardToInitialQueryParameters'],
                },
                TIME_CHANGED: {
                  target: 'initializingQuery',
                  internal: true,
                  actions: 'forwardToInitialQueryParameters',
                },
                CONTROL_PANELS_CHANGED: {
                  target: 'initializingQuery',
                  internal: true,
                  actions: 'forwardToInitialQueryParameters',
                },
                PANEL_FILTERS_CHANGED: {
                  target: 'initializingQuery',
                  internal: true,
                  actions: 'forwardToInitialQueryParameters',
                },
              },
            },
            initialized: {
              on: {
                VALID_QUERY_CHANGED: {
                  target: 'initialized',
                  internal: true,
                  actions: ['clearValidationError', 'storeQuery', 'storeFilters'],
                },
                INVALID_QUERY_CHANGED: {
                  target: 'initialized',
                  internal: true,
                  actions: 'storeValidationError',
                },
                TIME_CHANGED: {
                  target: 'initialized',
                  internal: true,
                  actions: 'storeTime',
                },
                UPDATE_TIME_RANGE: {
                  target: 'initialized',
                  internal: true,
                  actions: ['forwardToHostsViewQuery'],
                },
                CONTROL_PANELS_CHANGED: {
                  target: 'initialized',
                  internal: true,
                  actions: 'storeControlPanels',
                },
                UPDATE_CONTROL_PANELS: {
                  target: 'initialized',
                  internal: true,
                  actions: ['forwardToHostsViewQuery'],
                },
                PANEL_FILTERS_CHANGED: {
                  target: 'initialized',
                  internal: true,
                  actions: ['storePanelFilters', 'forwardToHostsViewQuery'],
                },
              },
            },
          },
          invoke: [
            {
              src: 'hostsViewQuery',
              id: 'hostsViewQuery',
            },
          ],
        },
      },
    },
    {
      actions: {
        forwardToInitialQueryParameters: actions.forwardTo('waitForInitialQueryParameters'),
        forwardToHostsViewQuery: actions.forwardTo('hostsViewQuery'),
        storeDataViewError: actions.assign((_context, event) => {
          return event.type === 'LOADING_DATA_VIEW_FAILED'
            ? ({ dataViewError: event.error } as HostsViewPageContextWithDataViewError)
            : {};
        }),
        storeDataView: actions.assign((_context, event) => {
          return event.type === 'LOADING_DATA_VIEW_SUCCEEDED'
            ? ({
                dataView: event.dataView,
              } as HostsViewPageContextWithDataView)
            : {};
        }),
        storeQuery: actions.assign((_context, event) => {
          return 'parsedQuery' in event && 'query' in event
            ? ({
                parsedQuery: event.parsedQuery,
                query: event.query,
              } as HostsViewPageContextWithQuery)
            : {};
        }),
        storeTime: actions.assign((_context, event) => {
          return 'timeRange' in event && 'isoTimeRange' in event && 'timestamps' in event
            ? ({
                timeRange: event.timeRange,
                isoTimeRange: event.isoTimeRange,
                timestamps: event.timestamps,
              } as HostsViewPageContextWithTime)
            : {};
        }),
        storeFilters: actions.assign((_context, event) => {
          return 'filters' in event
            ? ({
                filters: event.filters,
              } as HostsViewPageContextWithFilters)
            : {};
        }),
        storePanelFilters: actions.assign((_context, event) => {
          return 'panelFilters' in event
            ? ({
                panelFilters: event.panelFilters,
              } as HostsViewPageContextWithPanelFilters)
            : {};
        }),
        storeControlPanels: actions.assign((_context, event) => {
          return 'controlPanels' in event
            ? ({
                controlPanels: event.controlPanels,
              } as HostsViewPageContextWithControlPanels)
            : {};
        }),
        storeValidationError: actions.assign((_context, event) =>
          'validationError' in event
            ? ({
                validationError: event.validationError,
              } as HostsViewPageContextWithQueryParseError)
            : {}
        ),
        clearValidationError: actions.assign(
          (_context, _event) =>
            ({ validationError: undefined } as Omit<
              HostsViewPageContextWithQueryParseError,
              'validationError'
            >)
        ),
      },
    }
  );

export type HostsViewPageStateMachine = ReturnType<typeof createPureHostsViewPageStateMachine>;
export type HostsViewPageActorRef = ActorRefFrom<HostsViewPageStateMachine>;
export type HostsViewPageState = EmittedFrom<HostsViewPageActorRef>;
export type HostsViewPageSend = HostsViewPageActorRef['send'];

export type InitializedHostsViewPageState = MatchedStateFromActor<
  HostsViewPageActorRef,
  { hasDataViewIndices: 'initialized' }
>;

export type HostsViewPageStateMachineDependencies = {
  dataViewStateNotifications: DataViewNotificationChannel;
} & HostsViewQueryStateMachineDependencies;

export const createHostsViewPageStateMachine = ({
  kibanaQuerySettings,
  dataViewStateNotifications,
  queryStringService,
  filterManagerService,
  urlStateStorage,
  timeFilterService,
}: HostsViewPageStateMachineDependencies) =>
  createPureHostsViewPageStateMachine().withConfig({
    services: {
      dataViewNotifications: () => dataViewStateNotifications.createService(),
      hostsViewQuery: (context) => {
        if (!('dataView' in context)) {
          throw new Error('Failed to spawn log stream query service: no DataView in context');
        }

        const initialTimeRangeExpression: TimeRange = DEFAULT_TIMERANGE;

        const { from: parsedFrom = '', to: parsedTo = '' } = parseDateRange({
          from: DEFAULT_TIMERANGE.from,
          to: DEFAULT_TIMERANGE.to,
        });

        return createHostsViewQueryStateMachine(
          {
            timeRange: initialTimeRangeExpression,
            dataView: context.dataView,
            isoTimeRange: { from: parsedFrom, to: parsedTo },
            timestamps: {
              from: datemathToEpochMillis(initialTimeRangeExpression.from, 'down') ?? 0,
              to: datemathToEpochMillis(initialTimeRangeExpression.to, 'up') ?? 0,
            },
          },
          {
            kibanaQuerySettings,
            queryStringService,
            filterManagerService,
            urlStateStorage,
            timeFilterService,
          }
        );
      },
      waitForInitialQueryParameters: waitForInitialQueryParameters(),
    },
  });
