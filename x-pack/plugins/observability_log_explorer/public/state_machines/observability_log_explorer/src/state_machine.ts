/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { CreateLogExplorerController } from '@kbn/log-explorer-plugin/public';
import { actions, createMachine, InterpreterFrom } from 'xstate';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { DEFAULT_CONTEXT } from './defaults';
import {
  ObservabilityLogExplorerContext,
  ObservabilityLogExplorerEvent,
  ObservabilityLogExplorerTypeState,
} from './types';
import { initializeFromUrl, updateUrlFromLogExplorerState } from './url_state_storage_service';
import { createController, subscribeToLogExplorerState } from './controller_service';
import { initializeFromTimeFilterService } from './time_filter_service';

export const createPureObservabilityLogExplorerStateMachine = (
  initialContext: ObservabilityLogExplorerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QHkBGswCcBuBDVAlgDYEAuAngDID2UAogB4AOR1mWAdAK4B2BfpArhIAvSAGIA2gAYAuolBNqsMgWo8FIBogDMOjgFYAbAEZpAdgCcRgwBYAHAcsGANCHK7bHWztsGTRjomevbmRpYAvhFuaBg4+MRkVLSMLGyc-KrCBCL8UABimNQAtgAqBMVg+cSkWADKWNgEAMZg4gCSAHLtpe0AgpTtAFp0ACIA+vkASsgAsuO9s3ST7ZSldFPjdRsAau0AwnQy8kggSiqC6praCAC0ZvrhRua24Tp2jiZuHggATEb2Dj-aQ2PQmcEGSFRGLoRoJEgUGj0ZisdiYDiZQTZXI8ApFYoAVUwRA63V6A2GY0mM3mBKmlGOmnOqiupxutx0Rg49ksv2kBl+9hMQp0oV+30QBnsXgsAX8lhevx0lki0RAsThhARyWRaTRHGa7Fwglx+3UpCKRCIWHE+2QnVKM0olA2432UzofXWo0Zp2Zlw0bMQt0FHCMAN85jC9k5tl+cYlCFCJg4QRMxnM0lsZkcRmh6th8S1SSRqVRGQEQlEkG4PAA1jxqAB3HillHpTB1UjGtqUZAAcXGdAAGgAFPsezZ1Upe5b7AASfU6-bGvsUyhZgdANyVBg4JmzRl+UtFFks9nsiYh0n3tn59lM-2FNnzGqLiURKXb+sxVZyNbwEgIDbPV6m7WpxD7QcR3HZBJy2Gd1jdRdl1XOQmQ3ANrklUxDFCSxDwVX4TAIq9BXMIFnnTc9gXseMojVRsIDgTQ3zwYtP11ctMAwi41C3LRg3TFMnheN4Pn8RN7h0CjpDk6QDyFcxiOkX5VRhOJ2I-HUyw7Wtf2xSBeM3bCEAot4LyFHl42cEEpNsSxDHkkwlTMKwH2cV9Cy07UQO4jFK2xPJChKcpKmqIhak7RoWjAYysKDO57Bvayswc0EDxeMiuVscwdEFAUBRci9fi8zT4RLL9QPRAzRGC-EiSIeL+NMjkuXeNT3PDF5fFcdxEDjFNlNBSxwQvXKdDKzVtL8vTDTAY08jNHgLWoK0sGa1lt2DTkOGsJUHNGuSSJ8RMXhTEw8t8S61LkpwpvfXyqv82r-wgTaBPZOjvGSz49F5RxzEvfqEDMdMwzvBwAnMAwoxIh6fMqri9NesQIFrBtm1bZ6Oy7HsPta3wfukP7lQKoGr2fDhpEsTllNCAwdAUya1TYirON0n9AurdHAIIYCcbRPHagJxKjBp-cDCzA9LDuqxLEph9qdp55yMZhSDAYiIgA */
  createMachine<
    ObservabilityLogExplorerContext,
    ObservabilityLogExplorerEvent,
    ObservabilityLogExplorerTypeState
  >(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'ObservabilityLogExplorer',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: 'initializingFromTimeFilterService',
        },
        initializingFromTimeFilterService: {
          invoke: {
            src: 'initializeFromTimeFilterService',
          },
          on: {
            INITIALIZED_FROM_TIME_FILTER_SERVICE: {
              target: 'initializingFromUrl',
              actions: ['storeInitialTimeFilter'],
            },
          },
        },
        initializingFromUrl: {
          invoke: {
            src: 'initializeFromUrl',
          },
          on: {
            INITIALIZED_FROM_URL: {
              target: '#creatingController',
              actions: ['storeInitialUrlState'],
            },
          },
        },
        creatingController: {
          id: 'creatingController',
          invoke: {
            src: 'createController',
          },
          on: {
            CONTROLLER_CREATED: {
              target: 'initialized',
              actions: ['storeController'],
            },
          },
        },
        initialized: {
          invoke: {
            src: 'subscribeToLogExplorerState',
          },

          states: {
            unknownLogExplorerState: {
              on: {
                LOG_EXPLORER_STATE_CHANGED: {
                  target: 'validLogExplorerState',
                  actions: ['storeLogExplorerState', 'updateUrlFromLogExplorerState'],
                },
              },
            },

            validLogExplorerState: {
              on: {
                LOG_EXPLORER_STATE_CHANGED: {
                  actions: ['storeLogExplorerState', 'updateUrlFromLogExplorerState'],
                  target: 'validLogExplorerState',
                  internal: true,
                },
              },
            },
          },

          initial: 'unknownLogExplorerState',
        },
      },
    },
    {
      actions: {
        storeController: actions.assign((context, event) => {
          return 'controller' in event && event.type === 'CONTROLLER_CREATED'
            ? { controller: event.controller }
            : {};
        }),
        storeInitialTimeFilter: actions.assign((context, event) => {
          return 'time' in event &&
            'refreshInterval' in event &&
            event.type === 'INITIALIZED_FROM_TIME_FILTER_SERVICE'
            ? {
                initialLogExplorerState: {
                  ...('initialLogExplorerState' in context ? context.initialLogExplorerState : {}),
                  ...{ time: event.time, refreshInterval: event.refreshInterval },
                },
              }
            : {};
        }),
        storeInitialUrlState: actions.assign((context, event) => {
          return 'stateFromUrl' in event && event.type === 'INITIALIZED_FROM_URL'
            ? {
                initialLogExplorerState: {
                  ...('initialLogExplorerState' in context ? context.initialLogExplorerState : {}),
                  ...event.stateFromUrl,
                },
              }
            : {};
        }),
        storeLogExplorerState: actions.assign((context, event) => {
          return 'state' in event && event.type === 'LOG_EXPLORER_STATE_CHANGED'
            ? { logExplorerState: event.state }
            : {};
        }),
      },
      guards: {},
    }
  );

export interface ObservabilityLogExplorerStateMachineDependencies {
  createLogExplorerController: CreateLogExplorerController;
  initialContext?: ObservabilityLogExplorerContext;
  timeFilterService: TimefilterContract;
  toasts: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
}

export const createObservabilityLogExplorerStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  toasts,
  urlStateStorageContainer,
  createLogExplorerController,
  timeFilterService,
}: ObservabilityLogExplorerStateMachineDependencies) =>
  createPureObservabilityLogExplorerStateMachine(initialContext).withConfig({
    actions: {
      updateUrlFromLogExplorerState: updateUrlFromLogExplorerState({ urlStateStorageContainer }),
    },
    services: {
      createController: createController({ createLogExplorerController }),
      initializeFromTimeFilterService: initializeFromTimeFilterService({ timeFilterService }),
      initializeFromUrl: initializeFromUrl({ urlStateStorageContainer, toastsService: toasts }),
      subscribeToLogExplorerState,
    },
  });

export type ObservabilityLogExplorerService = InterpreterFrom<
  typeof createObservabilityLogExplorerStateMachine
>;
