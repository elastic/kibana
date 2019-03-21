/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { contains, get, has } from 'lodash';

const ROUTE_TAG_API = 'api';
const KIBANA_XSRF_HEADER = 'kbn-xsrf';
const KIBANA_VERSION_HEADER = 'kbn-version';

/**
 * Checks whether we can reply to the request with redirect response. We can do that
 * only for non-AJAX and non-API requests.
 * @param request HapiJS request instance to check redirection possibility for.
 */
export function canRedirectRequest(request: Request) {
  const hasVersionHeader = has(request.raw.req.headers, KIBANA_VERSION_HEADER);
  const hasXsrfHeader = has(request.raw.req.headers, KIBANA_XSRF_HEADER);

  const isApiRoute = contains(get(request, 'route.settings.tags'), ROUTE_TAG_API);
  const isAjaxRequest = hasVersionHeader || hasXsrfHeader;

  return !isApiRoute && !isAjaxRequest;
}
