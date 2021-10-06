/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateJobFn, CreateJobFnFactory } from '../../types';
import {
  IndexPatternSavedObjectDeprecatedCSV,
  JobParamsDeprecatedCSV,
  TaskPayloadDeprecatedCSV,
} from './types';

export const createJobFnFactory: CreateJobFnFactory<
  CreateJobFn<JobParamsDeprecatedCSV, TaskPayloadDeprecatedCSV>
> = function createJobFactoryFn(_reporting, logger) {
  return async function createJob(jobParams, context) {
    logger.warn(
      `The "/generate/csv" endpoint is deprecated and will be removed in Kibana 8.0. Please recreate the POST URL used to automate this CSV export.`
    );

    const savedObjectsClient = context.core.savedObjects.client;
    const indexPatternSavedObject = (await savedObjectsClient.get(
      'index-pattern',
      jobParams.indexPatternId
    )) as unknown as IndexPatternSavedObjectDeprecatedCSV;

    return {
      isDeprecated: true,
      indexPatternSavedObject,
      ...jobParams,
    };
  };
};
