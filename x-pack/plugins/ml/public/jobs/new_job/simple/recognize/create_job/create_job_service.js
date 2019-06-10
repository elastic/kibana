/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { mlJobService } from 'plugins/ml/services/job_service';
import { ml } from 'plugins/ml/services/ml_api_service';

export function CreateRecognizerJobsServiceProvider(Private) {

  const savedObjectsClient = Private(SavedObjectsClientProvider);
  class CreateRecognizerJobsService {

    constructor() {}

    createDatafeed(job, formConfig) {
      return new Promise((resolve, reject) => {
        const jobId = formConfig.jobLabel + job.id;

        mlJobService.saveNewDatafeed(job.datafeedConfig, jobId)
          .then((resp) => {
            resolve(resp);
          })
          .catch((resp) => {
            reject(resp);
          });
      });
    }

    startDatafeed(datafeedId, jobId, start, end) {
      return mlJobService.startDatafeed(datafeedId, jobId, start, end);
    }

    loadExistingSavedObjects(type) {
      return savedObjectsClient.find({ type, perPage: 1000 });
    }

    indexTimeRange(indexPattern, formConfig) {
      const query = formConfig.combinedQuery;
      return ml.getTimeFieldRange({
        index: indexPattern.title,
        timeFieldName: indexPattern.timeFieldName,
        query
      });
    }
  }
  return new CreateRecognizerJobsService();
}
