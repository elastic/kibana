/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { format } from 'url';
import type { FunctionRegistrationParameters } from '.';

export function registerKibanaFunction({
  registerFunction,
  resources,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'kibana',
      contexts: ['core'],
      description:
        'Call Kibana APIs on behalf of the user. Only call this function when the user has explicitly requested it, and you know how to call it, for example by querying the knowledge base or having the user explain it to you. Assume that pathnames, bodies and query parameters may have changed since your knowledge cut off date.',
      descriptionForUser: 'Call Kibana APIs on behalf of the user',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          method: {
            type: 'string',
            description: 'The HTTP method of the Kibana endpoint',
            enum: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'] as const,
          },
          pathname: {
            type: 'string',
            description: 'The pathname of the Kibana endpoint, excluding query parameters',
          },
          query: {
            type: 'object',
            description: 'The query parameters, as an object',
            additionalProperties: {
              type: 'string',
            },
          },
          body: {
            type: 'object',
            description: 'The body of the request',
          },
        },
        required: ['method', 'pathname'] as const,
      },
    },
    ({ arguments: { method, pathname, body, query } }, signal) => {
      const { request } = resources;

      const {
        protocol,
        host,
        username,
        password,
        pathname: pathnameFromRequest,
      } = request.rewrittenUrl!;
      const nextUrl = {
        host,
        protocol,
        username,
        password,
        pathname: pathnameFromRequest.replace(
          '/internal/observability_ai_assistant/chat/complete',
          pathname
        ),
        query,
      };

      return axios({
        method,
        headers: request.headers,
        url: format(nextUrl),
        data: body ? JSON.stringify(body) : undefined,
        signal,
      }).then((response) => {
        return { content: response.data };
      });
    }
  );
}
