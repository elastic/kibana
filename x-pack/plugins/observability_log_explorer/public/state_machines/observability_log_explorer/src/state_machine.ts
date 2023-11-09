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
import { map, throwError } from 'rxjs';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { DEFAULT_CONTEXT } from './defaults';
import {
  ObservabilityLogExplorerContext,
  ObservabilityLogExplorerEvent,
  ObservabilityLogExplorerTypeState,
} from './types';
import { initializeFromUrl, updateUrlFromLogExplorerState } from './url_state_storage_service';
import { createController } from './controller_service';
import { initializeFromTimeFilterService } from './time_filter_service';

export const createPureObservabilityLogExplorerStateMachine = (
  initialContext: ObservabilityLogExplorerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QHkBGswCcBuBDVAlgDYEAuAngDID2UAogB4AOR1mWAdAK4B2BfpArhIAvSAGIA2gAYAuolBNqsMgWo8FIBogDMOjgFYAbAEZpAdgCcRgwBYAHAcsGANCHK7bHWztsGTRjomevbmRpYAvhFuaBg4+MRkVLSMLGyc-KrCBCL8UABimNQAtgAqBMVg+cSkWADKWNgEAMZg4gCSAHLtpe0AgpTtAFp0ACIA+vkASsgAsuO9s3ST7ZSldFPjdRsAau0AwnQy8kggSiqC6praCAC0ZvrhRua24Tp2jiZuHggATEb2Dj-aQ2PQmcEGSFRGLoRoJEgUGj0ZisdiYDiZQTZXI8ApFYoAVUwRA63V6A2GY0mM3mBKmlGOmnOqiupxutx0Rg49ksv2kBl+9hMQp0oV+30QBnsXgsAX8lhevx0lki0RAsThhARyWRaTRHGa7Fwglx+3UpCKRCIWHE+2QnVKM0olA2432UzofXWo0Zp2Zlw0bMQHMB9h05h0v3Mxl+KpM1glCB5XN+ZgCzijUvMJmh6th8S1SSRqVRGQEQlEEkoyAA4uM6AANAAK1Y9mzqpS9y32AAk+p0a2NfYplCzA6AbpzLIZbKnRWHfADOYnLLYTBwjL9fj5s7G1-8omqeNQIHBNBqC4lESkUelMEzRwHrsGTP4N9YXm8Pv5E-dwxxpEA6QzFsax+UjX5cwvPBC2vXVS3RXhMQrHJIAfC41HHLREHMd95yFHlt2cEFf1AwwgJMJUzCsexwgMKD8xgq8dRLO8MXLbE8kKEpykqaoiFqTAGhwFowHQsdnzuexpG5XlpFsUDQRMWwXkTSiuRUyNHF+AVKPsexILVaD4SLG89TLLJRC4-EiSIcSnyDO5OQ4d5Yxooxnh8PxE1nddzH+AxlXBfTNIYuImO1Ytb31Q0wGNPIzR4C1qCtLB7MwySOS5awlVAywzGA1cdETF51xMCNfHK2NAKcMLNWYqLzPRZDsTQv1HwyxzbksfR-OA8wDP05xlXFdxEBA35vAGqqQNebdDwiIA */
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
              actions: ['storeTimeFilter'],
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
              actions: ['storeUrlState'],
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
            src: 'listenForLogExplorerStateChanges',
          },
          on: {
            LOG_EXPLORER_STATE_CHANGED: {
              actions: ['updateUrlFromLogExplorerState'],
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
        storeTimeFilter: actions.assign((context, event) => {
          return 'time' in event &&
            'refreshInterval' in event &&
            event.type === 'INITIALIZED_FROM_TIME_FILTER_SERVICE'
            ? {
                initialControllerState: {
                  ...('initialControllerState' in context ? context.initialControllerState : {}),
                  ...{ time: event.time, refreshInterval: event.refreshInterval },
                },
              }
            : {};
        }),
        storeUrlState: actions.assign((context, event) => {
          return 'stateFromUrl' in event && event.type === 'INITIALIZED_FROM_URL'
            ? {
                initialControllerState: {
                  ...('initialControllerState' in context ? context.initialControllerState : {}),
                  ...event.stateFromUrl,
                },
              }
            : {};
        }),
      },
      guards: {},
    }
  );

export interface ObservabilityLogExplorerStateMachineDependencies {
  initialContext?: ObservabilityLogExplorerContext;
  toasts: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
  createLogExplorerController: CreateLogExplorerController;
  timeFilterService: TimefilterContract;
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
      // updateUrlFromLogExplorerState: updateUrlFromLogExplorerState({ urlStateStorageContainer }),
    },
    services: {
      initializeFromUrl: initializeFromUrl({ urlStateStorageContainer, toastsService: toasts }),
      createController: createController({ createLogExplorerController }),
      initializeFromTimeFilterService: initializeFromTimeFilterService({ timeFilterService }),
      listenForLogExplorerStateChanges: (context, event) => {
        return 'controller' in context
          ? context.controller?.logExplorerState$.pipe(
              map((value) => ({ type: 'LOG_EXPLORER_STATE_CHANGED', state: value }))
            )
          : throwError(
              () => new Error('Failed to subscribe to controller: no controller in context')
            );
      },
    },
  });

export type ObservabilityLogExplorerService = InterpreterFrom<
  typeof createObservabilityLogExplorerStateMachine
>;
