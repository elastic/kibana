/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fetch from 'node-fetch';
import querystring from 'querystring';
import { Logger } from 'src/core/server';
import { RequestHandlerContext, KibanaRequest, KibanaResponseFactory } from 'src/core/server';
import { ConfigType } from '../index';

interface IAppSearchRequestParams<ResponseBody> {
  config: ConfigType;
  log: Logger;
  path: string;
  hasValidData?: (body?: ResponseBody) => boolean;
}

/**
 * This function creates a handler, in a standard way, for handling App Search
 * API requests.
 *
 * This handler assumes that it will essentially just proxy the App Search API
 * request, so the request body and request parameters, and body are simply
 * passed through.
 */
export function createAppSearchRequestHandler<ResponseBody>({
  config,
  log,
  path,
  hasValidData = () => true,
}: IAppSearchRequestParams<ResponseBody>) {
  return async (
    _context: RequestHandlerContext,
    request: KibanaRequest<unknown, Readonly<{}>, unknown>,
    response: KibanaResponseFactory
  ) => {
    try {
      const enterpriseSearchUrl = config.host as string;
      const params = querystring.stringify(request.query);
      const url = `${encodeURI(enterpriseSearchUrl)}${path}?${params}`;

      const apiResponse = await fetch(url, {
        headers: { Authorization: request.headers.authorization as string },
      });

      const body = await apiResponse.json();

      if (hasValidData(body)) {
        return response.ok({ body });
      } else {
        // Either a completely incorrect Enterprise Search host URL was configured, or App Search is returning bad data
        throw new Error(`Invalid data received from App Search: ${JSON.stringify(body)}`);
      }
    } catch (e) {
      log.error(`Cannot connect to App Search: ${e.toString()}`);
      if (e instanceof Error) log.debug(e.stack as string);

      return response.customError({
        statusCode: 502,
        body: 'Error connecting or fetching data from Enterprise Search',
      });
    }
  };
}

export const createEnterpriseSearchRequestHandler = createAppSearchRequestHandler;
