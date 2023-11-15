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
  /** @xstate-layout N4IgpgJg5mDOIC5QHkBGswCcBuBDVAlgDYEAuAngDID2UAogB4AOR1mWAdAK4B2BfpArhIAvSAGIA2gAYAuolBNqsMgWo8FIBogDMOjgFYAbAEZpAdgCcRgwBYAHAcsGANCHK7bHWztsGTRjomevbmRpYAvhFuaBg4+MRkVLSMLGyc-KrCBCL8UABimNQAtgAqBMVg+cSkWADKWNgEAMZg4gCSAHLtpe0AgpTtAFp0ACIA+vkASsgAsuO9s3ST7ZSldFPjdRsAau0AwnQy8kggSiqC6praCAC0ZvrhRua24Tp2jiZuHggATEb2Dj-aQ2PQmcEGSFRGLoRoJEgUGj0ZisdiYDiZQTZXI8ApFYoAVUwRA63V6A2GY0mM3mBKmlGOmnOqiupxutx0Rg49ksv2kBl+9hMQp0oV+30QBnsXgsAX8lhevx0lki0RAsThhARyWRaTRHGa7Fwglx+3UpCKRCIWHE+2QnVKM0olA2432UzofXWo0Zp2Zlw0bMQHMB9h05h0v3MVj00bsEoQPJMHCMtl+zj8tks0l+0PVsPiWqSSNSqIyAiEogklGQAHFxnQABoABRrHs2dVKXuW+wAEn1OrWxr7FMoWYHQDdfgZ9P8w5Y-CDXnYdAmkym058TAqwqKomqeNQIHBNBrC4lESkUelMEyxwHrsGTP4U9YXm8Pv4E-dwxxpP--0sbdpAXAxpFsPMzzwItL11Mt0V4TFKxySA7wuNQJy0RBzFfUV7CFHlfizMCjG-LNDAAkwlTMKx7HCAxIILaCLx1UsbwxCtsTyQoSnKSpqiIWpMAaHAWjANDx0fO57GkbleXArNQRMWwXgTKiuRUyNHGnX4qPw3M1Sg+FiyvPVyyyURuPxIkiAkh8gzuTkOHedNaKMZ4fD8BM02Tcx-hnIDhWlCNGLiZjtRLa99UNMBjTyM0eAtagrSwOyMKkjkuWsJUsyA-9tx8BMXmTEwI18Ur03-JxQs1FjIrM9EkOxVC-XvdKHNuSx9D86RSvsQUeQC8V3EQMw028cwhT8sbXiI-cIiAA */
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
          on: {
            LOG_EXPLORER_STATE_CHANGED: {
              actions: ['storeLogExplorerState', 'updateUrlFromLogExplorerState'],
            },
          },
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
