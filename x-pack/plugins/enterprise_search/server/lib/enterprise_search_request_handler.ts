/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fetch from 'node-fetch';
import querystring from 'querystring';
import {
  RequestHandler,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from 'src/core/server';
import { ConfigType } from '../index';
import { JSON_HEADER } from '../../common/constants';

interface IConstructorDependencies {
  config: ConfigType;
  log: Logger;
}
interface IRequestParams<ResponseBody> {
  path: string;
  params?: object;
  hasValidData?: (body?: ResponseBody) => boolean;
}
export interface IEnterpriseSearchRequestHandler {
  createRequest(requestParams?: object): RequestHandler<unknown, unknown, unknown>;
}

/**
 * This helper lib creates a single standard DRY way of handling
 * Enterprise Search API requests.
 *
 * This handler assumes that it will essentially just proxy the
 * Enterprise Search API request, so the request body and request
 * parameters are simply passed through.
 */
export class EnterpriseSearchRequestHandler {
  private enterpriseSearchUrl: string;
  private log: Logger;

  constructor({ config, log }: IConstructorDependencies) {
    this.log = log;
    this.enterpriseSearchUrl = config.host as string;
  }

  createRequest<ResponseBody>({
    path,
    params = {},
    hasValidData = () => true,
  }: IRequestParams<ResponseBody>) {
    return async (
      _context: RequestHandlerContext,
      request: KibanaRequest<unknown, unknown, unknown>,
      response: KibanaResponseFactory
    ) => {
      try {
        // Set up API URL
        const queryParams = { ...(request.query as object), ...params };
        const queryString = !this.isEmptyObj(queryParams)
          ? `?${querystring.stringify(queryParams)}`
          : '';
        const url = encodeURI(this.enterpriseSearchUrl + path + queryString);

        // Set up API options
        const { method } = request.route;
        const headers = { Authorization: request.headers.authorization as string, ...JSON_HEADER };
        const body = !this.isEmptyObj(request.body as object)
          ? JSON.stringify(request.body)
          : undefined;

        // Call the Enterprise Search API and pass back response to the front-end
        const apiResponse = await fetch(url, { method, headers, body });

        if (apiResponse.url.endsWith('/login') || apiResponse.url.endsWith('/ent/select')) {
          throw new Error('Cannot authenticate Enterprise Search user');
        }

        const { status } = apiResponse;
        const text = await apiResponse.text();
        let json;

        try {
          json = JSON.parse(text);
        } catch (e) {
          throw new Error(
            `Server responded with invalid json. Status code was: ${status}. Body was '${text}'`
          );
        }

        if (hasValidData(json)) {
          return response.custom({ statusCode: status, body: json });
        } else {
          this.log.debug(`Invalid data received from <${url}>: ${JSON.stringify(json)}`);
          throw new Error('Invalid data received');
        }
      } catch (e) {
        const errorMessage = `Error connecting to Enterprise Search: ${e?.message || e.toString()}`;

        this.log.error(errorMessage);
        if (e instanceof Error) this.log.debug(e.stack as string);

        return response.customError({ statusCode: 502, body: errorMessage });
      }
    };
  }

  // Small helper
  isEmptyObj(obj: object) {
    return Object.keys(obj).length === 0;
  }
}
