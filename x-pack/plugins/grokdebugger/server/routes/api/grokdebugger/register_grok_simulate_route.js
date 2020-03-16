/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { GrokdebuggerRequest } from '../../../models/grokdebugger_request';
import { GrokdebuggerResponse } from '../../../models/grokdebugger_response';

const escapeHatch = schema.object({}, { allowUnknowns: true });

export function registerGrokSimulateRoute(framework) {
  // TODO: Handle license check here
  //const licensePreRouting = licensePreRoutingFactory(server);
  framework.registerRoute(
    {
      method: 'POST',
      path: '/api/grokdebugger/simulate',
      validate: {
        // TODO: Add real validation here
        body: escapeHatch,
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
