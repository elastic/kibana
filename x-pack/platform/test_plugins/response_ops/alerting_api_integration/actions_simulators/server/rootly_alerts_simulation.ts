/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
} from '@kbn/core/server';

const ROUTING_FIELDS = ['service', 'team', 'functionality', 'catalogs', 'routing_key'];
const UNLIMITED_BY_CONNECTOR = 'The connector does not limit the length of this field';

export function initPlugin(router: IRouter, path: string) {
  router.post(
    {
      path,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
        authc: {
          enabled: false,
          reason:
            'This route simulates an external service endpoint and does not require authentication.',
        },
      },
      validate: {
        body: schema.object(
          {
            event: schema.oneOf([schema.literal('trigger'), schema.literal('resolve')]),
            dedup_key: schema.unboundedString({ reason: UNLIMITED_BY_CONNECTOR }),
            title: schema.maybe(schema.unboundedString({ reason: UNLIMITED_BY_CONNECTOR })),
          },
          {
            unknowns: 'allow',
          }
        ),
      },
    },
    // Rootly Alerts simulator: create a connector pointing here, and you can get
    // different responses based on the title posted.
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { body } = req;

      // The connector sends a target on its own, with no routing value.
      const target = body?.rootly?.notification_target;
      if (target) {
        const routed = ROUTING_FIELDS.some((field) => field in body);
        if (routed || target.type !== 'EscalationPolicy' || target.id !== 'known-target-id') {
          return res.custom({
            statusCode: 400,
            body: {
              errors: [
                {
                  title: routed
                    ? 'routing value sent with a target'
                    : 'notification target is invalid or not accessible',
                  status: '400',
                },
              ],
            },
            bypassErrorFormat: true,
          });
        }
      } else if (body?.title === 'expect-a-target') {
        return res.custom({
          statusCode: 400,
          body: { errors: [{ title: 'no target was sent', status: '400' }] },
          bypassErrorFormat: true,
        });
      }

      // bypassErrorFormat keeps the body in the shape Rootly sends for an error
      switch (body?.title) {
        case 'respond-with-429':
          return res.custom({
            statusCode: 429,
            headers: { 'retry-after': '30' },
            body: { errors: [{ title: 'rate limit exceeded', status: '429' }] },
            bypassErrorFormat: true,
          });
        case 'respond-with-502':
          return res.custom({
            statusCode: 502,
            body: { error: 'bad gateway' },
            bypassErrorFormat: true,
          });
        case 'respond-with-404':
          return res.custom({
            statusCode: 404,
            body: { errors: [{ title: 'integration cannot be found', status: '404' }] },
            bypassErrorFormat: true,
          });
      }

      return res.custom({ statusCode: 200, body: { action: 'created', ids: [body.dedup_key] } });
    }
  );
}
