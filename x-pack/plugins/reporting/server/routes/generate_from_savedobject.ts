/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseObject, ResponseToolkit } from 'hapi';
import Joi from 'joi';
import { get } from 'lodash';
import { API_BASE_URL_V1, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../common/constants';
import { JobDoc, JobDocOutput, JobParams, KbnServer } from '../../types';
// @ts-ignore
import { getDocumentPayloadFactory } from './lib/get_document_payload';
import { getRouteConfigFactoryReportingPre } from './lib/route_config_factories';
import { HandlerErrorFunction, HandlerFunction, QueuedJobPayload } from './types';

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
  const getDocumentPayload = getDocumentPayloadFactory(server);

  // csv: immediate download
  server.route({
    path: `${BASE_GENERATE}/immediate/csv/saved-object/{savedObjectType}:{savedObjectId}`,
    method: 'POST',
    options: routeOptions,
    handler: async (request: Request, h: ResponseToolkit) => {
      /*
       * 1. Queue a job with getJobFromRouteHandler
       *   - `isImmediate: true` gets us the complete result data in payload.objects
       * 2. Copy the completed data stashed in the job as output.content
       *   - Makes the content available for download
       * 3. Return a response with CSV content
       */
      const queuedJob: QueuedJobPayload = await getJobFromRouteHandler(
        handleRoute,
        handleRouteError,
        request,
        h,
        {
          isImmediate: true,
        }
      );

      // FIXME this is REALLY ugly
      const jobSource: JobDoc = get(queuedJob, 'source.job');
      const output: JobDocOutput = getDocumentPayload({
        _source: {
          ...jobSource,
          status: 'completed',
          output: {
            content: jobSource.payload.objects,
            content_type: 'text/csv',
          },
        },
      });

      let response: ResponseObject;
      response = h
        .response(output.content)
        .type(output.contentType)
        .code(output.statusCode);

      if (output.headers) {
        Object.keys(output.headers).forEach(key => {
          response.header(key, output.headers[key]);
        });
      }

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
