/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2UDKAXATmAhgLYAK+M2+WYAdAK4B2Alk1o-sowF6QDEAMgHkAggBEAkgDkA4gH1BsgGpiAogHUZGACpCASpuUiA2gAYAuolAAHVLEatU9CyAAeiALQAmAJzUPHgGwArIEALAAcHmHhXsEhADQgAJ6IAQDM1IHGYQDs2ZnZxl5e-l6pAL5lCWiYuAQkZGAUVHRMLGwc3BD8wuLScgKKKuoAYkJifAYm5kgg1rb2jjOuCJ4hAIzUqZklHgX+xqlrkQnJCKlB1P4loYH+qV7hHoEVVejYeESk5FiUNAzMdnaXF4glEklk8hkSjUGgAqgBheHKAyTMxOOaAhxOZbZNbZajGXLBVIkrJrYInRBHYzUEIeVIhVJhNZZLws7IhF4garvOpfRo-Zr-NrsYFdUG9CEDKFDOGI5EiSZraZWGyYxagHEhEIEwkeI7Zc7GO6UhCZHzZML7MKBDwhQp0zmVblvWqfBpNGhofAQZhQPjoBSMMAAd26YL6kOhIzGEyMaJmGIW2JS4VpJTCWXp5K82Q8pvN1Et1tt9oedq5PLd9W+v2o3t99H9geDYYl4P6gxhGARSJR8ZVszVyaWiEZPnt-m8Ry8xjta38pqN1FK+uy+w8xhCgS8lddHxrArrDb9AagQdD4clnZl3d7CqVg6TjCxo4QISumy2MWNMWiAVNO58WMFkImMOc50CMI9xqA9+U9etUB9U8W1DYZ8EYZAQR6Dso1lLRdH0Ad0WHF8NRcdxvF8AJYgiKIwhiUIC1SDwMgNcC8g5O1nmdKs4I9QUaAAC3wWAzwvEMxHoX0AGM4BaAFWFFToeB0ZQkTEBQDBkSQxE0MQhD4GRiF0IQAFllH0HQMCmEj5jIlMEBnfxqAiYojjWVJCjnJcwnSIIrSuNZZ2CGJyl4-c+QEusRLE1DJOkxg5NgBSRQ6XgFEMsQRBkABFWFlB0ABNGR4QACSEaRUSfUjX01Kl-DyWk1giW0p3tElTTxfFwhCPYQIXXE1idV5YKi2tmli8TWyk2T5OFQFlN4SRMr4bK8oK4rSoqqriMTWryOWBdGtckCQMCEknn8MIl21FcWLxVJDUzfwWv8GDeXdCbhNE6bQ1mpL5MUoEVNW9b8sKkrysqqRqrs9VHMGwJmtagI7QOVICznFd1yebdMgutY1gqZ16FQCA4CcPjxqPKh4ZHeqVkiHwtl-XZjQOTzTTcNk2NtQ4-A5q0PureDBNSxb0ogemHLfOkurpahyXArIbTZIItxF-jvsQ5Cmz+kMZbqiiEF2DJQiuK0bVyH94iSRAmTCTZ3ICPMtj8HjRs+w8EJPfX4vQzDICNw7EGR5k7S8NJGrZNXAJ3IsnvtImt28aCIrGr7aZ+uLzxmxLkpDxHNxpC7dn2K404pe331YrwokNQ1GIF7ItZphCpvigHkolpSpaLt8jjTMv12NKd6+r04nlYgbDjxO0-KnNus4736u4LoG0rFAfGc8qIi0Cck1cCQ1K4LJ4iznS1zjzG0WOXn3xcIRhYFsf28-+jf4H2+zjaOw4XKbijt4YIWRbjZHjhaJ6T1cSwIxiTMoQA */
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
                    [RELATIVE_END_UPDATE_DELAY]: [
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

          // Reset the target position if it doesn't fall within the new range.
          const targetPositionShouldReset =
            _context.targetPosition &&
            (event.timestamps.startTimestamp > _context.targetPosition.time ||
              event.timestamps.endTimestamp < _context.targetPosition.time);

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
