/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { schema } from '@kbn/config-schema';

export class EndpointPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    core.http.createRouter().get(
      {
        path: '/endpoint/process-lineage',
        validate: {
          query: schema.object({
            uniqueProcessID: schema.string(),
            endpointID: schema.string(),
          }),
        },
      },
      async function(context, request, response) {
        return response.ok({
          body: JSON.stringify({ ok: true }),
        });
      }
    );
  }

  public start() {}
  public stop() {}
}
