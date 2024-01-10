/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { createPlainError, formatErrors } from '@kbn/io-ts-utils';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import * as Either from 'fp-ts/lib/Either';
import * as rt from 'io-ts';
import { InvokeCreator } from 'xstate';
import { OBSERVABILITY_LOG_EXPLORER_URL_STATE_KEY } from '../../../../common';
import type { ObservabilityLogExplorerContext, ObservabilityLogExplorerEvent } from './types';
import * as urlSchemaV1 from './url_schema_v1';

interface ObservabilityLogExplorerUrlStateDependencies {
  toastsService: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
}

export const updateUrlFromLogExplorerState =
  ({ urlStateStorageContainer }: { urlStateStorageContainer: IKbnUrlStateStorage }) =>
  (context: ObservabilityLogExplorerContext, event: ObservabilityLogExplorerEvent) => {
    if (!('logExplorerState' in context)) {
      return;
    }

    // we want to write in the newest schema
    const encodedUrlStateValues = urlSchemaV1.stateFromUntrustedUrlRT.encode(
      context.logExplorerState
    );

    urlStateStorageContainer.set(OBSERVABILITY_LOG_EXPLORER_URL_STATE_KEY, encodedUrlStateValues, {
      replace: true,
    });
  };

export const initializeFromUrl =
  ({
    toastsService,
    urlStateStorageContainer,
  }: ObservabilityLogExplorerUrlStateDependencies): InvokeCreator<
    ObservabilityLogExplorerContext,
    ObservabilityLogExplorerEvent
  > =>
  (_context, _event) =>
  (send) => {
    const urlStateValues =
      urlStateStorageContainer.get<unknown>(OBSERVABILITY_LOG_EXPLORER_URL_STATE_KEY) ?? undefined;

    // in the future we'll have to more schema versions to the union
    const stateValuesE = rt
      .union([rt.undefined, urlSchemaV1.stateFromUntrustedUrlRT])
      .decode(urlStateValues);

    if (Either.isLeft(stateValuesE)) {
      withNotifyOnErrors(toastsService).onGetError(
        createPlainError(formatErrors(stateValuesE.left))
      );
      send({
        type: 'INITIALIZED_FROM_URL',
        stateFromUrl: undefined,
      });
    } else {
      send({
        type: 'INITIALIZED_FROM_URL',
        stateFromUrl: stateValuesE.right,
      });
    }
  };
