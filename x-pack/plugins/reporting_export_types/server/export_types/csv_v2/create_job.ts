/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  JobParamsCsvFromSavedObject,
  TaskPayloadCsvFromSavedObject,
} from '@kbn/reporting-export-types/common/csv_v2';
import type { CreateJobFn, CreateJobFnFactory } from '@kbn/reporting-plugin/server/types';

type CreateJobFnType = CreateJobFn<JobParamsCsvFromSavedObject, TaskPayloadCsvFromSavedObject>;

export const createJobFnFactory: CreateJobFnFactory<CreateJobFnType> = function createJobFactoryFn(
  reporting
) {
  return async function createJob(jobParams, _context, req) {
    // 1. Validation of locatorParams
    const { locatorParams } = jobParams;
    const { id, params } = locatorParams[0];
    if (
      !locatorParams ||
      !Array.isArray(locatorParams) ||
      locatorParams.length !== 1 ||
      id !== 'DISCOVER_APP_LOCATOR' ||
      !params
    ) {
      throw Boom.badRequest('Invalid Job params: must contain a single Discover App locator');
    }

    if (!params || !params.savedSearchId || typeof params.savedSearchId !== 'string') {
      throw Boom.badRequest('Invalid Discover App locator: must contain a savedSearchId');
    }

    // use Discover contract to get the title of the report from job params
    const { discover: discoverPluginStart } = await reporting.getPluginStartDeps();
    const locatorClient = await discoverPluginStart.locator.asScopedClient(req);
    const title = await locatorClient.titleFromLocator(params);

    return { ...jobParams, title };
  };
};
