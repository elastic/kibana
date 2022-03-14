/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SavedObjectsServiceStart, KibanaRequest } from 'kibana/server';
import { SavedObjectsClient } from '../../../../../src/core/server';
import { ML_JOB_SAVED_OBJECT_TYPE } from '../../common/types/saved_objects';
import type { TrainedModelJob } from './service';

export function savedObjectClientsFactory(
  getSavedObjectsStart: () => SavedObjectsServiceStart | null
) {
  return {
    // create a saved object client scoped to the current request
    // which has access to ml-job objects
    getMlSavedObjectsClient: (request: KibanaRequest) => {
      const savedObjectsStart = getSavedObjectsStart();
      if (savedObjectsStart === null) {
        return null;
      }
      return savedObjectsStart.getScopedClient(request, {
        includedHiddenTypes: [ML_JOB_SAVED_OBJECT_TYPE],
      });
    },
    // create a saved object client which has access to all saved objects
    // no matter the space access of the current user.
    getInternalSavedObjectsClient: () => {
      const savedObjectsStart = getSavedObjectsStart();
      if (savedObjectsStart === null) {
        return null;
      }
      const savedObjectsRepo = savedObjectsStart.createInternalRepository();
      return new SavedObjectsClient(savedObjectsRepo);
    },
  };
}

export function getSavedObjectClientError(error: any) {
  return error.isBoom && error.output?.payload ? error.output.payload : error.body ?? error;
}

export function getJobDetailsFromTrainedModel(
  model: estypes.MlTrainedModelConfig | estypes.MlPutTrainedModelRequest['body']
): TrainedModelJob | null {
  // @ts-ignore types are wrong
  if (model.metadata?.analytics_config === undefined) {
    return null;
  }

  // @ts-ignore types are wrong
  const jobId: string = model.metadata.analytics_config.id;
  // @ts-ignore types are wrong
  const createTime: number = model.metadata.analytics_config.create_time;
  return { job_id: jobId, create_time: createTime };
}
