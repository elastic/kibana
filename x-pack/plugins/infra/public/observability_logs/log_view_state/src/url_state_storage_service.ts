/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { IToasts } from '@kbn/core/public';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { InvokeCreator } from 'xstate';
import * as Either from 'fp-ts/lib/Either';
import { identity, pipe } from 'fp-ts/lib/function';
import { map } from 'rxjs';
import { createPlainError, formatErrors } from '../../../../common/runtime_types';
import {
  LogViewReference,
  logViewReferenceRT,
  PersistedLogViewReference,
} from '../../../../common/log_views';
import { LogViewContext, LogViewEvent } from './types';
import { replaceStateKeyInQueryString } from '../../../utils/url_state';

export const defaultLogViewKey = 'logView';
const defaultLegacySourceIdKey = 'sourceId';

interface LogViewUrlStateDependencies {
  logViewKey?: string;
  sourceIdKey?: string;
  toastsService: IToasts;
  urlStateStorage: IKbnUrlStateStorage;
}

export const updateContextInUrl =
  ({ urlStateStorage, logViewKey = defaultLogViewKey }: LogViewUrlStateDependencies) =>
  (context: LogViewContext, _event: LogViewEvent) => {
    if (!('logViewReference' in context)) {
      throw new Error('Missing keys from context needed to sync to the URL');
    }

    urlStateStorage.set(logViewKey, logViewStateInUrlRT.encode(context.logViewReference), {
      replace: true,
    });
  };

export const initializeFromUrl =
  ({
    logViewKey = defaultLogViewKey,
    sourceIdKey = defaultLegacySourceIdKey,
    toastsService,
    urlStateStorage,
  }: LogViewUrlStateDependencies): InvokeCreator<LogViewContext, LogViewEvent> =>
  (_context, _event) =>
  (send) => {
    const logViewReference = getLogViewReferenceFromUrl({
      logViewKey,
      sourceIdKey,
      toastsService,
      urlStateStorage,
    });

    send({
      type: 'INITIALIZED_FROM_URL',
      logViewReference,
    });
  };

export const getLogViewReferenceFromUrl = ({
  logViewKey,
  sourceIdKey,
  toastsService,
  urlStateStorage,
}: LogViewUrlStateDependencies): LogViewReference | null => {
  const logViewQueryValueFromUrl = urlStateStorage.get(logViewKey!);
  const logViewQueryE = decodeLogViewQueryValueFromUrl(logViewQueryValueFromUrl);

  const legacySourceIdQueryValueFromUrl = urlStateStorage.get(sourceIdKey!);
  const sourceIdQueryE = decodeSourceIdQueryValueFromUrl(legacySourceIdQueryValueFromUrl);

  if (Either.isLeft(logViewQueryE) || Either.isLeft(sourceIdQueryE)) {
    withNotifyOnErrors(toastsService).onGetError(
      createPlainError(
        formatErrors([
          ...(Either.isLeft(logViewQueryE) ? logViewQueryE.left : []),
          ...(Either.isLeft(sourceIdQueryE) ? sourceIdQueryE.left : []),
        ])
      )
    );

    return null;
  } else {
    return pipe(
      // Via the legacy sourceId key
      pipe(sourceIdQueryE.right, Either.fromNullable(null), Either.map(convertSourceIdToReference)),
      // Via the logView key
      Either.alt(() => pipe(logViewQueryE.right, Either.fromNullable(null))),
      Either.fold(identity, identity)
    );
  }
};

// NOTE: Certain navigations within the Logs solution will remove the logView URL key,
// we want to ensure the logView key is present in the URL at all times by monitoring for it's removal.
export const listenForUrlChanges =
  ({
    urlStateStorage,
    logViewKey = defaultLogViewKey,
  }: {
    urlStateStorage: LogViewUrlStateDependencies['urlStateStorage'];
    logViewKey?: LogViewUrlStateDependencies['logViewKey'];
  }): InvokeCreator<LogViewContext, LogViewEvent> =>
  (context, event) => {
    return urlStateStorage
      .change$(logViewKey)
      .pipe(
        map((value) =>
          value === undefined || value === null
            ? { type: 'LOG_VIEW_URL_KEY_REMOVED' }
            : { type: 'LOG_VIEW_URL_KEY_CHANGED' }
        )
      );
  };

const logViewStateInUrlRT = rt.union([logViewReferenceRT, rt.null]);
const sourceIdStateInUrl = rt.union([rt.string, rt.null]);

const decodeLogViewQueryValueFromUrl = (queryValueFromUrl: unknown) => {
  return logViewStateInUrlRT.decode(queryValueFromUrl);
};

const decodeSourceIdQueryValueFromUrl = (queryValueFromUrl: unknown) => {
  return sourceIdStateInUrl.decode(queryValueFromUrl);
};

const convertSourceIdToReference = (sourceId: string): PersistedLogViewReference => {
  return {
    type: 'log-view-reference' as const,
    logViewId: sourceId,
  };
};

// NOTE: Used by link-to components
export const replaceLogViewInQueryString = (logViewReference: LogViewReference) =>
  replaceStateKeyInQueryString(defaultLogViewKey, logViewReference);

export type InitializeFromUrl = ReturnType<typeof initializeFromUrl>;
export type UpdateContextInUrl = ReturnType<typeof updateContextInUrl>;
export type ListenForUrlChanges = ReturnType<typeof listenForUrlChanges>;
