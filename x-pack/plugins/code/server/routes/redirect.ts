/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import hapi from 'hapi';
import url from 'url';
// @ts-ignore
import wreck from 'wreck';
import { Logger } from '../log';

export const BASE_PLACEHOLDER = '/{baseUrl}';

export async function mainNodeBaseUrl(redirectUrl: string) {
  const u = url.parse(redirectUrl);
  const res = await wreck.request('HEAD', '/', {
    baseUrl: `${u.protocol}//${u.host}`,
  });
  if (res.statusCode === 302 && res.headers.location) {
    return res.headers.location;
  } else {
    // no base url?
    return '';
  }
}

export function redirectRoute(server: hapi.Server, redirect: string, log: Logger) {
  let redirectUrl = redirect;
  const hasBaseUrl = redirectUrl.includes(BASE_PLACEHOLDER);
  const proxyHandler = {
    proxy: {
      passThrough: true,
      async mapUri(request: hapi.Request) {
        let uri;
        if (hasBaseUrl) {
          // send a head request to find main node's base url;
          const baseUrl = await mainNodeBaseUrl(redirectUrl);
          redirectUrl = redirect.replace(BASE_PLACEHOLDER, baseUrl);
        }
        uri = `${redirectUrl}${request.path}`;
        if (request.url.search) {
          uri += request.url.search;
        }
        log.info(`redirect ${request.path}${request.url.search || ''} to ${uri}`);
        return {
          uri,
        };
      },
    },
  };
  server.route({
    path: '/api/code/{p*}',
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    handler: proxyHandler,
  });
  server.route({
    path: '/api/lsp/{p*}',
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    handler: proxyHandler,
  });
}
