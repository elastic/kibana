/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseObject, ResponseToolkit } from 'hapi';
import Joi from 'joi';
import { get } from 'lodash';
import { API_BASE_URL_V1, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../common/constants';
import { JobParams } from '../../export_types/csv_from_savedobject';
import { JobDoc, JobDocOutput, KbnServer } from '../../types';
// @ts-ignore
import { getDocumentPayloadFactory } from './lib/get_document_payload';
import { getRouteConfigFactoryReportingPre } from './lib/route_config_factories';
import { HandlerErrorFunction, HandlerFunction, HandlerResult } from './types';

const BASE_GENERATE = `${API_BASE_URL_V1}/generate`;

/*
 * This function registers API Endpoints for queuing Reporting jobs. The API inputs are:
 * - "immediate" flag: whether to execute the job up front and make immediate download available
 * - saved object type and ID
 * - time range and time zone
 * - application state: generally, the filters and query bar state
 */
export function registerGenerateCsvFromVis(
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
  const getResult = async (
    request: Request,
    h: ResponseToolkit,
    options: { immediate: boolean }
  ): Promise<HandlerResult> => {
    const { savedObjectType, savedObjectId } = request.params;
    let result: HandlerResult;
    try {
      const jobParams: JobParams = { savedObjectType, savedObjectId, immediate: options.immediate };
      result = await handler(CSV_FROM_SAVEDOBJECT_JOB_TYPE, jobParams, request, h);
    } catch (err) {
      throw handleError(CSV_FROM_SAVEDOBJECT_JOB_TYPE, err);
    }
    return result;
  };

  // csv: immediate download
  server.route({
    path: `${BASE_GENERATE}/immediate/csv/saved-object/{savedObjectType}:{savedObjectId}`,
    method: 'POST',
    options: routeOptions,
    handler: async (request: Request, h: ResponseToolkit) => {
      const getDocumentPayload = getDocumentPayloadFactory(server);
      const result: HandlerResult = await getResult(request, h, { immediate: true });

      const docSource: JobDoc = get(result, 'source.job');
      if (docSource == null) {
        throw new Error('');
      }

      // FIXME this is a bit ugly
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
      return getResult(request, h, { immediate: false });
    },
  });
}
