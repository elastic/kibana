/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../src/core/server';

const ROUTE_TAG_API = 'api';
const KIBANA_XSRF_HEADER = 'kbn-xsrf';
const KIBANA_VERSION_HEADER = 'kbn-version';

/**
 * Checks whether we can reply to the request with redirect response. We can do that
 * only for non-AJAX and non-API requests.
 * @param request HapiJS request instance to check redirection possibility for.
 */
export function canRedirectRequest(request: KibanaRequest) {
  const headers = request.headers;
  const route = request.route;
  const hasVersionHeader = headers.hasOwnProperty(KIBANA_VERSION_HEADER);
  const hasXsrfHeader = headers.hasOwnProperty(KIBANA_XSRF_HEADER);

  const isApiRoute =
    route.options.tags.includes(ROUTE_TAG_API) ||
    (route.path.startsWith('/api/') && route.path !== '/api/security/logout') ||
    route.path.startsWith('/internal/');
  const isAjaxRequest = hasVersionHeader || hasXsrfHeader;

  return !isApiRoute && !isAjaxRequest;
}
