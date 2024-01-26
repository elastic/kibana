/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { convertISODateToNanoPrecision } from '@kbn/logs-shared-plugin/common';
import moment from 'moment';
import { actions, ActorRefFrom, createMachine, EmittedFrom, SpecialTargets } from 'xstate';
import { isSameTimeKey } from '../../../../common/time';
import { OmitDeprecatedState, sendIfDefined } from '../../xstate_helpers';
import { DESIRED_BUFFER_PAGES, RELATIVE_END_UPDATE_DELAY } from './defaults';
import { LogStreamPositionNotificationEventSelectors } from './notifications';
import type {
  LogStreamPositionContext,
  LogStreamPositionContextWithLatestPosition,
  LogStreamPositionContextWithTargetPosition,
  LogStreamPositionContextWithVisiblePositions,
  LogStreamPositionEvent,
  LogStreamPositionTypestate,
} from './types';
import { initializeFromUrl, updateContextInUrl } from './url_state_storage_service';

export const createPureLogStreamPositionStateMachine = (initialContext: LogStreamPositionContext) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKAXATmAhgLYAKqsAlluagHbb5ZgB0Arjee1fsuQF6QBiAEoBRAMIiAkgDURAEQD6kgHKSAKpICCAGQUBFAKoihATQXFNQzQFkRa4xgDaABgC6iUAAcylajQ8gAB6IALQAbACsTAAcAEzRzgCcACzJccmxAIzR0QA0IACeiNkAzExhJSUA7FURsSXRYYklEVUAvm35aJi4BCQ+VLT0jEwcvtx8HFAAYjiohAY4yAIq6lrakgBa8grTQgDy1goGQtou7kgg3hSD-pfBCCGxTBHREYnOTelZ0bX5RQg0okmD8miVMhEwmEqmFGh0uuhsHgiKQbn5hswxlwePwIExrr5aLBRpxyBNcQIAFIGazEBRqfb0ywAcTs5n2GDW+2U5wCBNuAQeVUSz2SULCmQ+zlScQi-0QyWcVSYVU+QIhzlejQi8JA3SRfVRhLoWAYmNJ5Mg+IGfmJWLJOMEomI+yEagU0kknIAQtoROzORpuU43HybbRBYg6mEmGloskqrEqjkwrFYvLAdEyhkItLMlVqtVc+1OnrEb0UeGTWaSeNHXj+bba9i+IINLYFGIABKaZSsuS8y6NiP3RDC57ChOpZzStKxOWFRBZMqpqr5xIpT6xEXRXX6iv9NFDU0je2WvFYAAWcywWB4NCgxHwMBENAgylQVAAZuQAMYMJtyAgZAwGEEQXTdD0vUkX1-RdQNJGDQcvCrSMEHeTJygSWJkg+X5FQhDN4xjNNIk1V4xRKWIwj3ctkUPY0MWbB1Wwva9PzvKYnxfN8P2-P8AKJJgrxvTiHzAiD3U9H0-QDLllBDC4UKPO5QAeTJJTKVVITTRpt3iDMaiiCINUSDTMlw-Nklonp6KNW4mLPethPY2970fZ8wFfd9P3IH9-1uYkRI49yBECWAT2YfAv0YHAAApRG0TQNFkBQRGURQDGIORkv9OQRCSkwAEoBH3Oyq0ci1nOCtyuM87y+L8gTApc0T3OQq5UNHBAzOiFVohFEo5xKZx6mSDNeqYDTakyVMlWiTIhpsg1KxUyq61Y1qQrqnifP4gKmxqsSoDCiKa2i2KEoK5KZH9dLMuy3KFHywqSrKw0Ksi5jzy22qH24rzeN8-zBJoILXOOxxMiUzqVLQ2plTqEoRWnGcUgmpopvjRUYWSbJWhKZaD3s9EvqczajvcgGGuB5qmxoYGCimAQOuHVSggVGpymhMJnAhVUEjqDNMiVKJaiG+dfgG6prN1BmIDgAJ3tWxjIrDOHupCDSyjiBIUjnDJsjyRdHjSGJEwWjd8zeNGifKtavrYcncXV400IyIjMI3b36lVXmIgTO2PodmtnamWZ5kWZBXYFTXnmlWE-hNka+uoxIA6zRJZUJ0tlYYhyyaq1iY78NCSkiFULLnSFkYlaEMwacok2yGcRZF1pMiDlWC9DovcWtFT4CHLq1IVRaYnjapEmTRNnHBYXqKm5vhWaBIJTqLv89J3uNv7tm7T7yAS5HUfAQlCfkinmfYjnzIM23KI04z5Hs83knjx3lt+8pnbAb2pqDpEmPuzB4eMtJV1lBURIdcqgZlhH1PmJkcJDTqItEsCJbLB1Vp-Fi38IZU3qkDfaoM7TATAMA92581wynnFAmBRExQgmormCIFEKjUTfp9HBP0f7-UIf-EGLVeFQAod1cyzx4isKqHOfMkIGEkWYeRYiVEaK5zolgnup5D5sTar-GmxCWoM2-EzB8ojT5t2BK8HClFFqREIibduzgVQRCGiNJUyRWEig6B0IAA */
  createMachine<LogStreamPositionContext, LogStreamPositionEvent, LogStreamPositionTypestate>(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'logStreamPositionState',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          meta: {
            _DX_warning_:
              "The Position machine cannot initializeFromUrl until after the Query machine has initialized, this is due to a dual dependency on the 'logPosition' URL parameter for legacy reasons.",
          },
          on: {
            RECEIVED_INITIAL_QUERY_PARAMETERS: {
              target: 'initializingFromUrl',
            },
          },
        },
        initializingFromUrl: {
          on: {
            INITIALIZED_FROM_URL: [
              {
                target: 'initialized',
                actions: ['storeTargetPosition', 'storeLatestPosition'],
              },
            ],
          },
          invoke: {
            src: 'initializeFromUrl',
          },
        },
        initialized: {
          type: 'parallel',
          states: {
            positions: {
              initial: 'initialized',
              states: {
                initialized: {
                  entry: ['updateContextInUrl', 'notifyPositionsChanged'],
                  on: {
                    JUMP_TO_TARGET_POSITION: {
                      target: 'initialized',
                      actions: ['updateTargetPosition'],
                    },
                    REPORT_VISIBLE_POSITIONS: {
                      target: 'initialized',
                      actions: ['updateVisiblePositions'],
                    },
                    TIME_CHANGED: {
                      target: 'initialized',
                      actions: ['updatePositionsFromTimeChange'],
                    },
                  },
                },
              },
            },
            throttlingPageEndNotifications: {
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    REPORT_VISIBLE_POSITIONS: {
                      target: 'throttling',
                    },
                  },
                },
                throttling: {
                  after: {
                    RELATIVE_END_UPDATE_DELAY: [
                      {
                        target: 'notifying',
                        cond: 'hasReachedPageEndBuffer',
                      },
                      {
                        target: 'idle',
                      },
                    ],
                  },
                  on: {
                    REPORT_VISIBLE_POSITIONS: {
                      target: 'throttling',
                    },
                  },
                },
                notifying: {
                  entry: ['notifyPageEndBufferReached'],
                  always: 'idle',
                },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        notifyPositionsChanged: actions.pure(() => undefined),
        notifyPageEndBufferReached: actions.pure(() => undefined),
        storeTargetPosition: actions.assign((_context, event) =>
          'targetPosition' in event
            ? ({
                targetPosition: event.targetPosition,
              } as LogStreamPositionContextWithTargetPosition)
            : {}
        ),
        storeLatestPosition: actions.assign((_context, event) =>
          'latestPosition' in event
            ? ({
                latestPosition: event.latestPosition,
              } as LogStreamPositionContextWithLatestPosition)
            : {}
        ),
        updateTargetPosition: actions.assign((_context, event) => {
          if (!('targetPosition' in event)) return {};

          const nextTargetPosition = event.targetPosition?.time
            ? {
                time: event.targetPosition.time,
                tiebreaker: event.targetPosition.tiebreaker ?? 0,
              }
            : null;

          const nextLatestPosition = !isSameTimeKey(_context.targetPosition, nextTargetPosition)
            ? nextTargetPosition
            : _context.latestPosition;

          return {
            targetPosition: nextTargetPosition,
            latestPosition: nextLatestPosition,
          } as LogStreamPositionContextWithLatestPosition &
            LogStreamPositionContextWithTargetPosition;
        }),
        updatePositionsFromTimeChange: actions.assign((_context, event) => {
          if (!('timeRange' in event)) return {};

          const {
            timestamps: { startTimestamp, endTimestamp },
          } = event;

          // Reset the target position if it doesn't fall within the new range.
          const targetPositionNanoTime =
            _context.targetPosition && convertISODateToNanoPrecision(_context.targetPosition.time);
          const startNanoDate = convertISODateToNanoPrecision(moment(startTimestamp).toISOString());
          const endNanoDate = convertISODateToNanoPrecision(moment(endTimestamp).toISOString());

          const targetPositionShouldReset =
            targetPositionNanoTime &&
            (startNanoDate > targetPositionNanoTime || endNanoDate < targetPositionNanoTime);

          return {
            targetPosition: targetPositionShouldReset ? null : _context.targetPosition,
            latestPosition: targetPositionShouldReset ? null : _context.latestPosition,
          } as LogStreamPositionContextWithLatestPosition &
            LogStreamPositionContextWithTargetPosition;
        }),
        updateVisiblePositions: actions.assign((_context, event) =>
          'visiblePositions' in event
            ? ({
                visiblePositions: event.visiblePositions,
                latestPosition: !isSameTimeKey(
                  _context.visiblePositions.middleKey,
                  event.visiblePositions.middleKey
                )
                  ? event.visiblePositions.middleKey
                  : _context.visiblePositions.middleKey,
              } as LogStreamPositionContextWithVisiblePositions)
            : {}
        ),
      },
      delays: {
        RELATIVE_END_UPDATE_DELAY,
      },
      guards: {
        // User is close to the bottom of the page.
        hasReachedPageEndBuffer: (context, event) =>
          context.visiblePositions.pagesAfterEnd < DESIRED_BUFFER_PAGES,
      },
    }
  );

export type LogStreamPositionStateMachine = ReturnType<
  typeof createPureLogStreamPositionStateMachine
>;
export type LogStreamPositionActorRef = OmitDeprecatedState<
  ActorRefFrom<LogStreamPositionStateMachine>
>;
export type LogStreamPositionState = EmittedFrom<LogStreamPositionActorRef>;

export interface LogStreamPositionStateMachineDependencies {
  urlStateStorage: IKbnUrlStateStorage;
  toastsService: IToasts;
}

export const createLogStreamPositionStateMachine = (
  initialContext: LogStreamPositionContext,
  { urlStateStorage, toastsService }: LogStreamPositionStateMachineDependencies
) =>
  createPureLogStreamPositionStateMachine(initialContext).withConfig({
    actions: {
      updateContextInUrl: updateContextInUrl({ toastsService, urlStateStorage }),
      notifyPositionsChanged: sendIfDefined(SpecialTargets.Parent)(
        LogStreamPositionNotificationEventSelectors.positionsChanged
      ),
      notifyPageEndBufferReached: sendIfDefined(SpecialTargets.Parent)(
        LogStreamPositionNotificationEventSelectors.pageEndBufferReached
      ),
    },
    services: {
      initializeFromUrl: initializeFromUrl({ toastsService, urlStateStorage }),
    },
  });
