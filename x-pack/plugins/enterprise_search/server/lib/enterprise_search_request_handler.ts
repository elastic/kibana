/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch, { Response } from 'node-fetch';
import querystring from 'querystring';

import {
  RequestHandler,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';

import { ConfigType } from '..';

import {
  ENTERPRISE_SEARCH_KIBANA_COOKIE,
  JSON_HEADER,
  ERROR_CONNECTING_HEADER,
  READ_ONLY_MODE_HEADER,
} from '../../common/constants';

import { entSearchHttpAgent } from './enterprise_search_http_agent';

interface ConstructorDependencies {
  config: ConfigType;
  log: Logger;
}
interface RequestParams {
  path: string;
  params?: object;
  hasJsonResponse?: boolean;
  hasValidData?: Function;
}
interface ErrorResponse {
  message: string;
  attributes: {
    errors: string[];
  };
}
export interface IEnterpriseSearchRequestHandler {
  createRequest(requestParams?: RequestParams): RequestHandler<unknown, unknown, unknown>;
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
  private headers: Record<string, string> = {};
  private customHeaders: Record<string, string> = {};

  constructor({ config, log }: ConstructorDependencies) {
    this.log = log;
    this.enterpriseSearchUrl = config.host as string;
    this.customHeaders = config.customHeaders as Record<string, string>;
  }

  createRequest({
    path,
    params = {},
    hasJsonResponse = true,
    hasValidData = () => true,
  }: RequestParams) {
    return async (
      _context: RequestHandlerContext,
      request: KibanaRequest<unknown, unknown, unknown>,
      response: KibanaResponseFactory
    ) => {
      try {
        // Set up API URL
        const encodedPath = this.encodePathParams(path, request.params as Record<string, string>);
        const queryParams = { ...(request.query as object), ...params };
        const queryString = !this.isEmptyObj(queryParams)
          ? `?${querystring.stringify(queryParams)}`
          : '';
        const url = encodeURI(this.enterpriseSearchUrl) + encodedPath + queryString;

        // Set up API options
        const options = {
          method: request.route.method as string,
          headers: {
            Authorization: request.headers.authorization as string,
            ...JSON_HEADER,
            ...this.customHeaders,
          },
          body: this.getBodyAsString(request.body as object | Buffer),
          agent: entSearchHttpAgent.getHttpAgent(),
        };

        // Call the Enterprise Search API
        const apiResponse = await fetch(url, options);

        // Handle response headers
        this.setResponseHeaders(apiResponse);

        // Handle unauthenticated users / authentication redirects
        if (
          apiResponse.status === 401 ||
          apiResponse.url.endsWith('/login') ||
          apiResponse.url.endsWith('/ent/select')
        ) {
          return this.handleAuthenticationError(response);
        }

        // Handle 400-500+ responses from the Enterprise Search server
        const { status } = apiResponse;
        if (status >= 500) {
          if (this.headers[READ_ONLY_MODE_HEADER] === 'true') {
            // Handle 503 read-only mode errors
            return this.handleReadOnlyModeError(response);
          } else {
            // Handle unexpected server errors
            return this.handleServerError(response, apiResponse, url);
          }
        } else if (status >= 400) {
          return this.handleClientError(response, apiResponse);
        }

        // Check returned data
        let responseBody;

        if (hasJsonResponse) {
          const json = await apiResponse.json();

          if (!hasValidData(json)) {
            return this.handleInvalidDataError(response, url, json);
          }

          // Intercept data that is meant for the server side session
          const { _sessionData, ...responseJson } = json;
          if (_sessionData) {
            this.setSessionData(_sessionData);
            responseBody = responseJson;
          } else {
            responseBody = json;
          }
        } else {
          responseBody = apiResponse.body;
        }

        // Pass successful responses back to the front-end
        return response.custom({
          statusCode: status,
          headers: this.headers,
          body: responseBody,
        });
      } catch (e) {
        // Catch connection errors
        return this.handleConnectionError(response, e);
      }
    };
  }

  /**
   * There are a number of different expected incoming bodies that we handle & pass on to Enterprise Search for ingestion:
   * - Standard object data (should be JSON stringified)
   * - Empty (should be passed as undefined and not as an empty obj)
   * - Raw buffers (passed on as a string, occurs when using the `skipBodyValidation` lib helper)
   */
  getBodyAsString(body: object | Buffer): string | undefined {
    if (Buffer.isBuffer(body)) return body.toString();
    if (this.isEmptyObj(body)) return undefined;
    return JSON.stringify(body);
  }

  /**
   * This path helper is similar to React Router's generatePath, but much simpler &
   * does not use regexes. It enables us to pass a static '/foo/:bar/baz' string to
   * createRequest({ path }) and have :bar be automatically replaced by the value of
   * request.params.bar.
   * It also (very importantly) wraps all URL request params with encodeURIComponent(),
   * which is an extra layer of encoding required by the Enterprise Search server in
   * order to correctly & safely parse user-generated IDs with special characters in
   * their names - just encodeURI alone won't work.
   */
  encodePathParams(path: string, params: Record<string, string>) {
    const hasParams = path.includes(':');
    if (!hasParams) {
      return path;
    } else {
      return path
        .split('/')
        .map((pathPart) => {
          const isParam = pathPart.startsWith(':');
          if (!isParam) {
            return pathPart;
          } else {
            const pathParam = pathPart.replace(':', '');
            return encodeURIComponent(params[pathParam]);
          }
        })
        .join('/');
    }
  }

  /**
   * Attempt to grab a usable error body from Enterprise Search - this isn't
   * always possible because some of our internal endpoints send back blank
   * bodies, and sometimes the server sends back Ruby on Rails error pages
   */
  async getErrorResponseBody(apiResponse: Response) {
    const { statusText } = apiResponse;
    const contentType = apiResponse.headers.get('content-type') || '';

    // Default response
    let body: ErrorResponse = {
      message: statusText,
      attributes: { errors: [statusText] },
    };

    try {
      if (contentType.includes('application/json')) {
        // Try parsing body as JSON
        const json = await apiResponse.json();

        // Some of our internal endpoints return either an `error` or `errors` key,
        // which can both return either a string or array of strings ¯\_(ツ)_/¯
        const errors = json.error || json.errors || [statusText];
        body = {
          message: errors.toString(),
          attributes: { errors: Array.isArray(errors) ? errors : [errors] },
        };
      } else {
        // Try parsing body as text/html
        const text = await apiResponse.text();
        if (text) {
          body = {
            message: text,
            attributes: { errors: [text] },
          };
        }
      }
    } catch {
      // Fail silently
    }

    return body;
  }

  /**
   * Error response helpers
   */

  async handleClientError(response: KibanaResponseFactory, apiResponse: Response) {
    const { status } = apiResponse;
    const body = await this.getErrorResponseBody(apiResponse);

    return response.customError({ statusCode: status, headers: this.headers, body });
  }

  async handleServerError(response: KibanaResponseFactory, apiResponse: Response, url: string) {
    const { status } = apiResponse;
    const { message } = await this.getErrorResponseBody(apiResponse);

    // Don't expose server errors to the front-end, as they may contain sensitive stack traces
    const errorMessage =
      'Enterprise Search encountered an internal server error. Please contact your system administrator if the problem persists.';

    this.log.error(`Enterprise Search Server Error ${status} at <${url}>: ${message}`);
    return response.customError({ statusCode: 502, headers: this.headers, body: errorMessage });
  }

  handleReadOnlyModeError(response: KibanaResponseFactory) {
    const errorMessage =
      'Enterprise Search is in read-only mode. Actions that create, update, or delete information are disabled.';

    this.log.error(`Cannot perform action: ${errorMessage}`);
    return response.customError({ statusCode: 503, headers: this.headers, body: errorMessage });
  }

  handleInvalidDataError(response: KibanaResponseFactory, url: string, json: object) {
    const errorMessage = 'Invalid data received from Enterprise Search';

    this.log.error(`Invalid data received from <${url}>: ${JSON.stringify(json)}`);
    return response.customError({ statusCode: 502, headers: this.headers, body: errorMessage });
  }

  handleConnectionError(response: KibanaResponseFactory, e: Error) {
    const errorMessage = `Error connecting to Enterprise Search: ${e?.message || e.toString()}`;
    const headers = { ...this.headers, [ERROR_CONNECTING_HEADER]: 'true' };

    this.log.error(errorMessage);
    if (e instanceof Error) this.log.debug(e.stack as string);

    return response.customError({ statusCode: 502, headers, body: errorMessage });
  }

  /**
   * Note: Kibana auto logs users out when it receives a 401 response, so we want to catch and
   * return 401 responses from Enterprise Search as a 502 so Kibana sessions aren't interrupted
   */
  handleAuthenticationError(response: KibanaResponseFactory) {
    const errorMessage = 'Cannot authenticate Enterprise Search user';
    const headers = { ...this.headers, [ERROR_CONNECTING_HEADER]: 'true' };

    this.log.error(errorMessage);
    return response.customError({ statusCode: 502, headers, body: errorMessage });
  }

  /**
   * Set response headers
   *
   * Currently just forwards the read-only mode header, but we can expand this
   * in the future to pass more headers from Enterprise Search as we need them
   */

  setResponseHeaders(apiResponse: Response) {
    const readOnlyMode = apiResponse.headers.get(READ_ONLY_MODE_HEADER);
    this.headers[READ_ONLY_MODE_HEADER] = readOnlyMode as 'true' | 'false';
  }

  /**
   * Extract Session Data
   *
   * In the future, this will set the keys passed back from Enterprise Search
   * into the Kibana login session.
   * For now we'll explicity look for the Workplace Search OAuth token package
   * and stuff it into a cookie so it can be picked up later when we proxy the
   * OAuth callback.
   */
  setSessionData(sessionData: { [key: string]: string }) {
    if (sessionData.wsOAuthTokenPackage) {
      const anHourFromNow = new Date(Date.now());
      anHourFromNow.setHours(anHourFromNow.getHours() + 1);

      const cookiePayload = `${ENTERPRISE_SEARCH_KIBANA_COOKIE}=${sessionData.wsOAuthTokenPackage};`;
      const cookieRestrictions = `Path=/; Expires=${anHourFromNow.toUTCString()}; SameSite=Lax; HttpOnly`;

      this.headers['set-cookie'] = `${cookiePayload} ${cookieRestrictions}`;
    }
  }

  /**
   * Misc helpers
   */

  isEmptyObj(obj: object) {
    return Object.keys(obj).length === 0;
  }
}
