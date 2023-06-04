/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import { InvokeCreator } from 'xstate';
import { positionStateInUrlRT } from '../../../../common/log_views';
import { pickTimeKey } from '../../../../common/time';
import { createPlainError, formatErrors } from '../../../../common/runtime_types';
import type { LogStreamPositionContext, LogStreamPositionEvent } from './types';
interface LogStreamPositionUrlStateDependencies {
  positionStateKey?: string;
  toastsService: IToasts;
  urlStateStorage: IKbnUrlStateStorage;
}

export const defaultPositionStateKey = 'logPosition';

export const updateContextInUrl =
  ({
    urlStateStorage,
    positionStateKey = defaultPositionStateKey,
  }: LogStreamPositionUrlStateDependencies) =>
  (context: LogStreamPositionContext, _event: LogStreamPositionEvent) => {
    if (!('latestPosition' in context)) {
      throw new Error('Missing keys from context needed to sync to the URL');
    }

    urlStateStorage.set(
      positionStateKey,
      positionStateInUrlRT.encode({
        position: context.latestPosition ? pickTimeKey(context.latestPosition) : null,
      }),
      { replace: true }
    );
  };

export const initializeFromUrl =
  ({
    positionStateKey = defaultPositionStateKey,
    urlStateStorage,
    toastsService,
  }: LogStreamPositionUrlStateDependencies): InvokeCreator<
    LogStreamPositionContext,
    LogStreamPositionEvent
  > =>
  (_context, _event) =>
  (send) => {
    const positionQueryValueFromUrl = urlStateStorage.get(positionStateKey) ?? {};

    const initialUrlValues = pipe(
      decodePositionQueryValueFromUrl(positionQueryValueFromUrl),
      Either.map(({ position }) => ({
        targetPosition: position?.time
          ? {
              time: position.time,
              tiebreaker: position.tiebreaker ?? 0,
            }
          : null,
      })),
      Either.map(({ targetPosition }) => ({
        targetPosition,
        latestPosition: targetPosition,
      }))
    );

    if (Either.isLeft(initialUrlValues)) {
      withNotifyOnErrors(toastsService).onGetError(
        createPlainError(formatErrors(initialUrlValues.left))
      );

      send({
        type: 'INITIALIZED_FROM_URL',
        targetPosition: null,
        latestPosition: null,
      });
    } else {
      send({
        type: 'INITIALIZED_FROM_URL',
        targetPosition: initialUrlValues.right.targetPosition ?? null,
        latestPosition: initialUrlValues.right.latestPosition ?? null,
      });
    }
  };

const decodePositionQueryValueFromUrl = (queryValueFromUrl: unknown) => {
  return positionStateInUrlRT.decode(queryValueFromUrl);
};
