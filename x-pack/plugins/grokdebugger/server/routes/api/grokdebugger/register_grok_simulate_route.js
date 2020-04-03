/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { GrokdebuggerRequest } from '../../../models/grokdebugger_request';
import { GrokdebuggerResponse } from '../../../models/grokdebugger_response';

const requestBodySchema = schema.object({
  pattern: schema.string(),
  rawEvent: schema.string(),
  // We don't know these key / values up front as they depend on user input
  customPatterns: schema.object({}, { unknowns: 'allow' }),
});

export function registerGrokSimulateRoute(framework) {
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/grokdebugger/simulate',
      validate: {
        body: requestBodySchema,
      },
    },
    async (requestContext, request, response) => {
      try {
        const grokdebuggerRequest = GrokdebuggerRequest.fromDownstreamJSON(request.body);
        const simulateResponseFromES = await framework.callWithRequest(
          requestContext,
          'ingest.simulate',
          { body: grokdebuggerRequest.upstreamJSON }
        );
        const grokdebuggerResponse = GrokdebuggerResponse.fromUpstreamJSON(simulateResponseFromES);
        return response.ok({
          body: grokdebuggerResponse,
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
}
