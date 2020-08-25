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

interface IConstructorDependencies {
  config: ConfigType;
  log: Logger;
}
interface IRequestParams<ResponseBody> {
  path: string;
  hasValidData?: (body?: ResponseBody) => boolean;
}
export interface IEnterpriseSearchRequestHandler {
  createRequest(requestParams?: object): RequestHandler<unknown, Readonly<{}>, unknown>;
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

  createRequest<ResponseBody>({ path, hasValidData = () => true }: IRequestParams<ResponseBody>) {
    return async (
      _context: RequestHandlerContext,
      request: KibanaRequest<unknown, Readonly<{}>, unknown>,
      response: KibanaResponseFactory
    ) => {
      try {
        const params = request.query ? `?${querystring.stringify(request.query)}` : '';
        const url = encodeURI(this.enterpriseSearchUrl + path + params);

        const apiResponse = await fetch(url, {
          headers: { Authorization: request.headers.authorization as string },
        });

        const body = await apiResponse.json();

        if (hasValidData(body)) {
          return response.ok({ body });
        } else {
          throw new Error(`Invalid data received: ${JSON.stringify(body)}`);
        }
      } catch (e) {
        this.log.error(`Cannot connect to Enterprise Search: ${e.toString()}`);
        if (e instanceof Error) this.log.debug(e.stack as string);

        return response.customError({
          statusCode: 502,
          body: 'Error connecting or fetching data from Enterprise Search',
        });
      }
    };
  }
}
