/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { CoreSetup } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { BASE_API_URL } from '../../common';
import { PluginStartContract } from '../plugin';

// This route is responsible for taking a batch of click events from the browser
// and writing them to saved objects
export async function initLensUsageRoute(setup: CoreSetup<PluginStartContract>) {
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
        const client = (await context.core).savedObjects.client;

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
        if (SavedObjectsErrorHelpers.isForbiddenError(e)) {
          return res.forbidden();
        }
        if (e instanceof errors.ResponseError && e.statusCode === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          throw new Error(e.output.message);
        } else {
          throw e;
        }
      }
    }
  );
}
