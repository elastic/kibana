/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { CreateDatasetQualityController } from '@kbn/dataset-quality-plugin/public/controller';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { actions, createMachine, InterpreterFrom } from 'xstate';
import {
  createController,
  openDatasetFlyout,
  subscribeToDatasetQualityState,
} from './controller_service';
import { DEFAULT_CONTEXT } from './defaults';
import {
  ObservabilityDatasetQualityContext,
  ObservabilityDatasetQualityEvent,
  ObservabilityDatasetQualityTypeState,
} from './types';
import { initializeFromUrl, updateUrlFromDatasetQualityState } from './url_state_storage_service';

export const createPureObservabilityDatasetQualityStateMachine = (
  initialContext: ObservabilityDatasetQualityContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QHkBGswCcBuBDVAlgDYEAuAngDID2UAogB4AOR1mWAdAK4B2BfpArhIAvSAGIA2gAYAuolBNqsMgWo8FIBogDMOjgFYAbAEZpAdgCcRgwBYAHAcsGANCHK7bHWztsGTRjomevbmRpYAvhFuaBg4+MRkVLSMLGyc-KrCBCL8UABimNQAtgAqBMVg+cSkWADKWNgEAMZg4gCSAHLtpe0AgpTtAFp0ACIA+vkASsgAsuO9s3ST7ZSldFPjdRsAau0AwnQy8kggSiqC6praCAC0ZvrhRua24Tp2jiZuHggATEb2Dj-aQ2PQmcEGSFRGLoRoJEgUGj0ZisdiYDiZQTZXI8ApFYoAVUwRA63V6A2GY0mM3mBKmlGOmnOqiupxutx0Rg49ksv2kBl+9hMQp0oV+30QBnsXgsAX8lhevx0lki0RAsThhARyWRaTRHGa7Fwglx+3UpCKRCIWHE+2QnVKM0olA2432UzofXWo0Zp2Zlw0bMQt0FHCMAN85jC9k5tl+cYlCFCJg4QRMxnM0lsZkcRmh6th8S1SSRqVRGQEQlEkG4PAA1jxqAB3HillHpTB1UjGtqUZAAcXGdAAGgAFPsezZ1Upe5b7AASfU6-bGvsUyhZgdANyVBg4JmzRl+UtFFks9nsiYh0n3tn59lM-2FNnzGqLiURKXb+sxVZyNbwEgIDbPV6m7WpxD7QcR3HZBJy2Gd1jdRdl1XOQmQ3ANrklUxDFCSxDwVX4TAIq9BXMIFnnTc9gXseMojVRsIDgTQ3zwYtP11ctMAwi41C3LRg3TFMnheN4Pn8RN7h0CjpDk6QDyFcxiOkX5VRhOJ2I-HUyw7Wtf2xSBeM3bCEAot4LyFHl42cEEpNsSxDHkkwlTMKwH2cV9Cy07UQO4jFK2xPJChKcpKmqIhak7RoWjAYysKDO57Bvayswc0EDxeMiuVscwdEFAUBRci9fi8zT4RLL9QPRAzRGC-EiSIeL+NMjkuXeNT3PDF5fFcdxEDjFNlNBSxwQvXKdDKzVtL8vTDTAY08jNHgLWoK0sGa1lt2DTkOGsJUHNGuSSJ8RMXhTEw8t8S61LkpwpvfXyqv82r-wgTaBPZOjvGSz49F5RxzEvfqEDMdMwzvBwAnMAwoxIh6fMqri9NesQIFrBtm1bZ6Oy7HsPta3wfukP7lQKoGr2fDhpEsTllNCAwdAUya1TYirON0n9AurdHAIIYCcbRPHagJxKjBp-cDCzA9LDuqxLEph9qdp55yMZhSDAYiIgA */
  createMachine<
    ObservabilityDatasetQualityContext,
    ObservabilityDatasetQualityEvent,
    ObservabilityDatasetQualityTypeState
  >(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'ObservabilityDatasetQuality',
      initial: 'initializingFromUrl',
      states: {
        initializingFromUrl: {
          invoke: {
            src: 'initializeFromUrl',
          },
          on: {
            INITIALIZED_FROM_URL: {
              target: 'creatingController',
              actions: ['storeInitialUrlState'],
            },
          },
        },
        creatingController: {
          invoke: {
            src: 'createController',
          },
          on: {
            CONTROLLER_CREATED: {
              target: 'initialized',
              actions: ['storeController', 'openDatasetFlyout'],
            },
          },
        },
        initialized: {
          invoke: {
            src: 'subscribeToDatasetQualityState',
          },
          states: {
            unknownDatasetQualityState: {
              on: {
                DATASET_QUALITY_STATE_CHANGED: {
                  target: 'validDatasetQualityState',
                  actions: ['storeDatasetQualityState', 'updateUrlFromDatasetQualityState'],
                },
              },
            },
            validDatasetQualityState: {
              on: {
                DATASET_QUALITY_STATE_CHANGED: {
                  actions: ['storeDatasetQualityState', 'updateUrlFromDatasetQualityState'],
                  target: 'validDatasetQualityState',
                  internal: true,
                },
              },
            },
          },
          initial: 'unknownDatasetQualityState',
        },
      },
    },
    {
      actions: {
        storeController: actions.assign((_context, event) => {
          return 'controller' in event && event.type === 'CONTROLLER_CREATED'
            ? { controller: event.controller }
            : {};
        }),
        storeInitialUrlState: actions.assign((context, event) => {
          return 'stateFromUrl' in event && event.type === 'INITIALIZED_FROM_URL'
            ? {
                initialDatasetQualityState: {
                  ...('initialDatasetQualityState' in context
                    ? context.initialDatasetQualityState
                    : {}),
                  ...event.stateFromUrl,
                },
              }
            : {};
        }),
        storeDatasetQualityState: actions.assign((_context, event) => {
          return 'state' in event && event.type === 'DATASET_QUALITY_STATE_CHANGED'
            ? { datasetQualityState: event.state }
            : {};
        }),
      },
    }
  );

export interface ObservabilityDatasetQualityStateMachineDependencies {
  createDatasetQualityController: CreateDatasetQualityController;
  initialContext?: ObservabilityDatasetQualityContext;
  toasts: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
}

export const createObservabilityDatasetQualityStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  toasts,
  urlStateStorageContainer,
  createDatasetQualityController,
}: ObservabilityDatasetQualityStateMachineDependencies) =>
  createPureObservabilityDatasetQualityStateMachine(initialContext).withConfig({
    actions: {
      updateUrlFromDatasetQualityState: updateUrlFromDatasetQualityState({
        urlStateStorageContainer,
      }),
      openDatasetFlyout,
    },
    services: {
      createController: createController({ createDatasetQualityController }),
      initializeFromUrl: initializeFromUrl({ urlStateStorageContainer, toastsService: toasts }),
      subscribeToDatasetQualityState,
    },
  });

export type ObservabilityDatasetQualityService = InterpreterFrom<
  typeof createObservabilityDatasetQualityStateMachine
>;
