/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaResponseFactory,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { CloudDataAttributes, SolutionType } from '../routes/types';
import { CLOUD_DATA_SAVED_OBJECT_TYPE } from '../saved_objects';
import { CLOUD_DATA_SAVED_OBJECT_ID } from '../routes/constants';

export const persistTokenCloudData = async (
  savedObjectsClient: SavedObjectsClientContract,
  {
    logger,
    response,
    onboardingToken,
    solutionType,
  }: {
    logger?: Logger;
    response?: KibanaResponseFactory;
    onboardingToken?: string;
    solutionType?: string;
  }
) => {
  let cloudDataSo = null;
  try {
    cloudDataSo = await savedObjectsClient.get<CloudDataAttributes>(
      CLOUD_DATA_SAVED_OBJECT_TYPE,
      CLOUD_DATA_SAVED_OBJECT_ID
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      cloudDataSo = null;
    } else {
      if (response) {
        return response?.customError(error);
      } else if (logger) {
        logger.error(error);
      }
    }
  }
  try {
    if (onboardingToken && cloudDataSo === null) {
      await savedObjectsClient.create<CloudDataAttributes>(
        CLOUD_DATA_SAVED_OBJECT_TYPE,
        {
          onboardingData: {
            solutionType: solutionType as SolutionType,
            token: onboardingToken,
          },
        },
        { id: CLOUD_DATA_SAVED_OBJECT_ID }
      );
    } else if (
      onboardingToken &&
      cloudDataSo?.attributes.onboardingData.token &&
      cloudDataSo?.attributes.onboardingData.token !== onboardingToken
    ) {
      await savedObjectsClient.update<CloudDataAttributes>(
        CLOUD_DATA_SAVED_OBJECT_TYPE,
        CLOUD_DATA_SAVED_OBJECT_ID,
        {
          onboardingData: {
            ...cloudDataSo?.attributes.onboardingData,
            token: onboardingToken,
          },
        }
      );
    }
  } catch (error) {
    if (response) {
      return response?.customError(error);
    } else if (logger) {
      logger.error(error);
    }
  }
};
