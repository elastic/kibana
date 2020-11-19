/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { CoreSetup } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { BASE_API_URL } from '../../common';

// This route is responsible for taking a batch of click events from the browser
// and writing them to saved objects
export async function initLensUsageRoute(setup: CoreSetup) {
  const router = setup.http.createRouter();
  router.post(
    {
      path: `${BASE_API_URL}/stats`,
      validate: {
        body: schema.object({
          events: schema.mapOf(schema.string(), schema.mapOf(schema.string(), schema.number())),
          suggestionEvents: schema.mapOf(
            schema.string(),
            schema.mapOf(schema.string(), schema.number())
          ),
        }),
      },
    },
    async (context, req, res) => {
      const { events, suggestionEvents } = req.body;

      try {
        const client = context.core.savedObjects.client;

        const allEvents: Array<{
          type: 'lens-ui-telemetry';
          attributes: {};
        }> = [];

        events.forEach((subMap, date) => {
          subMap.forEach((count, key) => {
            allEvents.push({
              type: 'lens-ui-telemetry',
              attributes: {
                name: key,
                date,
                count,
                type: 'regular',
              },
            });
          });
        });
        suggestionEvents.forEach((subMap, date) => {
          subMap.forEach((count, key) => {
            allEvents.push({
              type: 'lens-ui-telemetry',
              attributes: {
                name: key,
                date,
                count,
                type: 'suggestion',
              },
            });
          });
        });

        if (allEvents.length) {
          await client.bulkCreate(allEvents);
        }

        return res.ok({ body: {} });
      } catch (e) {
        if (e.status === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          return res.internalError(e.output.message);
        } else {
          return res.internalError({
            body: Boom.internal(e.message || e.name),
          });
        }
      }
    }
  );
}
