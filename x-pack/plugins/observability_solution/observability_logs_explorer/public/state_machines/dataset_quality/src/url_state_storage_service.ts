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
import { OBSERVABILITY_DATASET_QUALITY_URL_STATE_KEY } from '../../../../common';
import type { ObservabilityDatasetQualityContext, ObservabilityDatasetQualityEvent } from './types';
import * as urlSchemaV1 from './url_schema_v1';

interface ObservabilityDatasetQualityUrlStateDependencies {
  toastsService: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
}

export const updateUrlFromDatasetQualityState =
  ({ urlStateStorageContainer }: { urlStateStorageContainer: IKbnUrlStateStorage }) =>
  (context: ObservabilityDatasetQualityContext, event: ObservabilityDatasetQualityEvent) => {
    if (!('datasetQualityState' in context)) {
      return;
    }

    const encodedUrlStateValues = urlSchemaV1.stateFromUntrustedUrlRT.encode(
      context.datasetQualityState
    );

    urlStateStorageContainer.set(
      OBSERVABILITY_DATASET_QUALITY_URL_STATE_KEY,
      encodedUrlStateValues,
      {
        replace: true,
      }
    );
  };

export const initializeFromUrl =
  ({
    toastsService,
    urlStateStorageContainer,
  }: ObservabilityDatasetQualityUrlStateDependencies): InvokeCreator<
    ObservabilityDatasetQualityContext,
    ObservabilityDatasetQualityEvent
  > =>
  (_context, _event) =>
  (send) => {
    const urlStateValues =
      urlStateStorageContainer.get<unknown>(OBSERVABILITY_DATASET_QUALITY_URL_STATE_KEY) ??
      undefined;

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
