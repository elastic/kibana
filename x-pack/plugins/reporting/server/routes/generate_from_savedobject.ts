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
import { HandlerErrorFunction, HandlerFunction, HandlerResult } from './types';

const BASE_GENERATE = `${API_BASE_URL_V1}/generate`;

const getExportHandlerResult = async (
  handler: HandlerFunction,
  handleError: HandlerErrorFunction,
  request: Request,
  h: ResponseToolkit,
  options: { isImmediate: boolean }
): Promise<HandlerResult> => {
  const { savedObjectType, savedObjectId } = request.params;
  let result: HandlerResult;
  try {
    const jobParams: JobParams = {
      savedObjectType,
      savedObjectId,
      isImmediate: options.isImmediate,
    };
    result = await handler(CSV_FROM_SAVEDOBJECT_JOB_TYPE, jobParams, request, h);
  } catch (err) {
    throw handleError(CSV_FROM_SAVEDOBJECT_JOB_TYPE, err);
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
  handler: HandlerFunction,
  handleError: HandlerErrorFunction
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
        }).required(),
      }),
    },
  };

  // csv: immediate download
  server.route({
    path: `${BASE_GENERATE}/immediate/csv/saved-object/{savedObjectType}:{savedObjectId}`,
    method: 'POST',
    options: routeOptions,
    handler: async (request: Request, h: ResponseToolkit) => {
      const getDocumentPayload = getDocumentPayloadFactory(server);
      const result: HandlerResult = await getExportHandlerResult(handler, handleError, request, h, {
        isImmediate: true,
      });

      // Emulate a document of a completed job and stick the generated contents into it
      // FIXME this is REALLY ugly
      const docSource: JobDoc = get(result, 'source.job');
      const output: JobDocOutput = getDocumentPayload({
        _source: {
          ...docSource,
          status: 'completed',
          output: {
            content: docSource.payload.objects,
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

      // @ts-ignore
      if (response.isBoom == null) {
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
      return getExportHandlerResult(handler, handleError, request, h, { isImmediate: false });
    },
  });
}
