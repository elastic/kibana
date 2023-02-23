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
import { createPlainError, formatErrors } from '../../../../common/runtime_types';
import { logViewReferenceRT, PersistedLogViewReference } from '../../../../common/log_views';
import { LogViewContext, LogViewEvent } from './types';

const defaultLogViewKey = 'logView';
const defaultLegacySourceIdKey = 'sourceId';

interface LogViewUrlStateDependencies {
  logViewKey?: string;
  sourceIdKey?: string;
  savedQueryIdKey?: string;
  toastsService: IToasts;
  urlStateStorage: IKbnUrlStateStorage;
}

export const initializeFromUrl =
  ({
    logViewKey = defaultLogViewKey,
    sourceIdKey = defaultLegacySourceIdKey,
    toastsService,
    urlStateStorage,
  }: LogViewUrlStateDependencies): InvokeCreator<LogViewContext, LogViewEvent> =>
  (_context, _event) =>
  (send) => {
    const logViewQueryValueFromUrl = urlStateStorage.get(logViewKey);
    const logViewQueryE = decodeLogViewQueryValueFromUrl(logViewQueryValueFromUrl);

    const legacySourceIdQueryValueFromUrl = urlStateStorage.get(sourceIdKey);
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

      send({
        type: 'INITIALIZED_FROM_URL',
        logView: null,
      });
    } else {
      send({
        type: 'INITIALIZED_FROM_URL',
        logView: pipe(
          // Via the legacy sourceId key
          pipe(
            sourceIdQueryE.right,
            Either.fromNullable(null),
            Either.map(convertSourceIdToReference)
          ),
          // Via the logView key
          Either.alt(() => pipe(logViewQueryE.right, Either.fromNullable(null))),
          Either.fold(identity, identity)
        ),
      });
    }
  };

const logViewStateInUrlRT = rt.union([logViewReferenceRT, rt.undefined]);
const sourceIdStateInUrl = rt.union([rt.string, rt.undefined]);

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
