/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { DatasetQualityPublicState } from '@kbn/dataset-quality-plugin/public/controller';
import { createPlainError, formatErrors } from '@kbn/io-ts-utils';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import * as Either from 'fp-ts/lib/Either';
import * as rt from 'io-ts';
import { DATA_QUALITY_URL_STATE_KEY } from '../../../common/url_schema';
import * as urlSchemaV1 from './url_schema_v1';

export const updateUrlFromDatasetQualityState = ({
  urlStateStorageContainer,
  datasetQualityState,
}: {
  urlStateStorageContainer: IKbnUrlStateStorage;
  datasetQualityState?: DatasetQualityPublicState;
}) => {
  if (!datasetQualityState) {
    return;
  }

  const encodedUrlStateValues = urlSchemaV1.stateFromUntrustedUrlRT.encode(datasetQualityState);

  urlStateStorageContainer.set(DATA_QUALITY_URL_STATE_KEY, encodedUrlStateValues, {
    replace: true,
  });
};

export const getDatasetQualityStateFromUrl = ({
  toastsService,
  urlStateStorageContainer,
}: {
  toastsService: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
}): Partial<DatasetQualityPublicState> | undefined => {
  const urlStateValues =
    urlStateStorageContainer.get<unknown>(DATA_QUALITY_URL_STATE_KEY) ?? undefined;

  const stateValuesE = rt
    .union([rt.undefined, urlSchemaV1.stateFromUntrustedUrlRT])
    .decode(urlStateValues);

  if (Either.isLeft(stateValuesE)) {
    withNotifyOnErrors(toastsService).onGetError(createPlainError(formatErrors(stateValuesE.left)));
    return undefined;
  } else {
    return stateValuesE.right;
  }
};
