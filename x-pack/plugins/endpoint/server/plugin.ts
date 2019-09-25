/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { schema } from '@kbn/config-schema';

export class EndpointPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.http.createRouter().get(
      {
        path: '/events',
        validate: {
          query: schema.object({
            subtype: schema.string(),
          }),
        },
      },
      async function(context, request, response) {
        let elasticsearchResponse;
        try {
          elasticsearchResponse = await context.core.elasticsearch.dataClient.callAsCurrentUser(
            'search',
            {
              body: {
                query: {
                  match: {
                    'endgame.event_subtype_full': {
                      query: request.query.subtype,
                    },
                  },
                },
              },
            }
          );
        } catch (error) {
          return response.internalError();
        }
        return response.ok({
          body: JSON.stringify({
            subtype: request.query.subtype,
            elasticsearchResponse,
          }),
        });
      }
    );
  }

  public start() {}
  public stop() {}
}
