/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseObject, ResponseToolkit } from 'hapi';
import Joi from 'joi';
import { get } from 'lodash';

// @ts-ignore no module definition
import { API_BASE_URL_V1, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../common/constants';
// @ts-ignore no module definition
import { getDocumentPayloadFactory } from './lib/get_document_payload';

import { createJobFactory, executeJobFactory } from '../../export_types/csv_from_savedobject';
import { JobDocPayload, JobDocOutputExecuted, JobParams, KbnServer } from '../../types';
import { LevelLogger } from '../lib/level_logger';
import { HandlerErrorFunction, HandlerFunction, QueuedJobPayload } from './types';
import { getRouteConfigFactoryReportingPre } from './lib/route_config_factories';

const BASE_GENERATE = `${API_BASE_URL_V1}/generate`;

interface KibanaResponse extends ResponseObject {
  isBoom: boolean;
}

/*
 * 1. Build `jobParams` object: job data that execution will need to reference in various parts of the lifecycle
 * 2. Pass the jobParams and other common params to `handleRoute`, a shared function to enqueue the job with the params
 * 3. Ensure that details for a queued job were returned
 */
const getJobFromRouteHandler = async (
  handleRoute: HandlerFunction,
  handleRouteError: HandlerErrorFunction,
  request: Request,
  h: ResponseToolkit,
  options: { isImmediate: boolean }
): Promise<QueuedJobPayload> => {
  const { savedObjectType, savedObjectId } = request.params;
  let result: QueuedJobPayload;
  try {
    const jobParams: JobParams = {
      savedObjectType,
      savedObjectId,
      isImmediate: options.isImmediate,
    };
    result = await handleRoute(CSV_FROM_SAVEDOBJECT_JOB_TYPE, jobParams, request, h);
  } catch (err) {
    throw handleRouteError(CSV_FROM_SAVEDOBJECT_JOB_TYPE, err);
  }

  if (get(result, 'source.job') == null) {
    throw new Error(`The Export handler is expected to return a result with job info! ${result}`);
  }

  return result;
};

/*
 * This function registers API Endpoints for queuing Reporting jobs. The API inputs are:
 * - "immediate" flag: whether to execute the job up front and make immediate download available
 * - saved object type and ID
 * - time range and time zone
 * - application state:
 *     - filters
 *     - query bar
 *     - local (transient) changes the user made to the saved object
 */
export function registerGenerateCsvFromSavedObject(
  server: KbnServer,
  handleRoute: HandlerFunction,
  handleRouteError: HandlerErrorFunction
) {
  const getRouteConfig = getRouteConfigFactoryReportingPre(server);
  const routeOptions = {
    ...getRouteConfig(() => CSV_FROM_SAVEDOBJECT_JOB_TYPE),
    validate: {
      params: Joi.object({
        savedObjectType: Joi.string().required(),
        savedObjectId: Joi.string().required(),
      }).required(),
      payload: Joi.object({
        state: Joi.object().default({}),
        timerange: Joi.object({
          timezone: Joi.string().default('UTC'),
          min: Joi.date().required(),
          max: Joi.date().required(),
        }).optional(),
      }),
    },
  };

  /*
   * CSV export with the `immediate` option does not queue a job with Reporting's ESQueue to run the job async. Instead, this does:
   *  - re-use the createJob function to build up es query config
   *  - re-use the executeJob function to run the scan and scroll queries and capture the entire CSV in a result object.
   */
  server.route({
    path: `${BASE_GENERATE}/immediate/csv/saved-object/{savedObjectType}:{savedObjectId}`,
    method: 'POST',
    options: routeOptions,
    handler: async (request: Request, h: ResponseToolkit) => {
      const logger = LevelLogger.createForServer(server, ['reporting', 'savedobject-csv']);

      const { savedObjectType, savedObjectId } = request.params;
      const jobParams: JobParams = {
        savedObjectType,
        savedObjectId,
        isImmediate: true,
      };
      const createJobFn = createJobFactory(server);
      const executeJobFn = executeJobFactory(server, request);
      const jobDocPayload: JobDocPayload = await createJobFn(jobParams, request.headers, request);
      const {
        content_type: jobOutputContentType,
        content: jobOutputContent,
        size: jobOutputSize,
      }: JobDocOutputExecuted = await executeJobFn(jobDocPayload, request);

      logger.info(`job output size: ${jobOutputSize} bytes`);

      /*
       * ESQueue worker function defaults `content` to null, even if the
       * executeJob returned undefined.
       *
       * This converts null to undefined so the value can be sent to h.response()
       */
      if (jobOutputContent === null) {
        logger.warn('CSV Job Execution created empty content result');
      }
      const response = h
        .response(jobOutputContent ? jobOutputContent : undefined)
        .type(jobOutputContentType);

      // Set header for buffer download, not streaming
      const { isBoom } = response as KibanaResponse;
      if (isBoom == null) {
        response.header('accept-ranges', 'none');
      }

      return response;
    },
  });

  // csv: queue job for execution
  server.route({
    path: `${BASE_GENERATE}/csv/saved-object/{savedObjectType}:{savedObjectId}`,
    method: 'POST',
    options: routeOptions,
    handler: async (request: Request, h: ResponseToolkit) => {
      return getJobFromRouteHandler(handleRoute, handleRouteError, request, h, {
        isImmediate: false,
      });
    },
  });
}
